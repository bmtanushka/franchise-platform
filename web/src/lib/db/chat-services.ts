import { sql } from "./client";
import type { SessionContext } from "./context";

// No RLS — chat_questions/chat_question_options/service_types aren't in
// the brief's protected set, same app-layer-only pattern as chat_settings/
// courses. Matches every other "admin manages platform config" feature's
// role pairing in this app.
const CHAT_SERVICE_MANAGER_ROLES = new Set(["super_admin", "franchisor"]);

export type QuestionFieldType = "text" | "email" | "phone" | "boolean" | "enum";
export type LeadFieldOption = "full_name" | "contact_email" | "contact_phone" | "postcode" | "consent_to_contact";

const FIELD_TYPES: Set<string> = new Set(["text", "email", "phone", "boolean", "enum"]);
const LEAD_FIELD_OPTIONS: Set<string> = new Set([
  "full_name",
  "contact_email",
  "contact_phone",
  "postcode",
  "consent_to_contact",
]);
// These 4 ship with every service and can't be removed — create_lead needs
// them to produce a usable lead, so "a service with zero closable
// questions" is structurally impossible rather than something validation
// has to catch after the fact. postcode is deliberately not in this set —
// it's optional, addable by the admin, since its framing ("match you with
// someone in your area") doesn't fit every possible custom service.
export const REQUIRED_SYSTEM_KEYS = new Set(["full_name", "contact_email", "contact_phone", "consent_to_contact"]);

function requireManager(ctx: SessionContext) {
  if (!CHAT_SERVICE_MANAGER_ROLES.has(ctx.role)) {
    throw new Error("Not authorized to manage chat services.");
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type ChatService = {
  id: string;
  key: string;
  name: string;
  corporateOnly: boolean;
  isActive: boolean;
  questionCount: number;
};

export async function listChatServices(ctx: SessionContext): Promise<ChatService[]> {
  requireManager(ctx);
  const rows = await sql<
    { id: string; key: string; name: string; corporate_only: boolean; is_active: boolean; question_count: number }[]
  >`
    select st.id, st.key, st.name, st.corporate_only, st.is_active,
      count(cq.id)::int as question_count
    from service_types st
    left join chat_questions cq on cq.service_type_id = st.id
    group by st.id
    order by st.created_at
  `;
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    corporateOnly: r.corporate_only,
    isActive: r.is_active,
    questionCount: r.question_count,
  }));
}

export type ChatQuestionOption = { value: string; label: string };

export type ChatQuestion = {
  id: string;
  key: string;
  prompt: string;
  fieldType: QuestionFieldType;
  leadField: LeadFieldOption | null;
  dependsOnKey: string | null;
  dependsOnMode: "equals" | "one_of" | null;
  dependsOnValues: string[] | null;
  position: number;
  options: ChatQuestionOption[];
};

export type ChatServiceDetail = ChatService & { questions: ChatQuestion[] };

/**
 * Ordered question list for a service, with options grouped per question —
 * no role gate (the gate belongs in the caller); shared by the admin
 * management UI (`getChatServiceDetail`) and the franchisee lead-entry
 * form (`web/src/lib/db/lead-entry.ts`), so both read from one query
 * instead of drifting apart.
 */
export async function getServiceQuestions(serviceId: string): Promise<ChatQuestion[]> {
  const rows = await sql<
    {
      id: string;
      key: string;
      prompt: string;
      field_type: QuestionFieldType;
      lead_field: LeadFieldOption | null;
      depends_on_key: string | null;
      depends_on_mode: "equals" | "one_of" | null;
      depends_on_values: string[] | null;
      position: number;
      option_value: string | null;
      option_label: string | null;
    }[]
  >`
    select
      cq.id, cq.key, cq.prompt, cq.field_type, cq.lead_field,
      cq.depends_on_key, cq.depends_on_mode, cq.depends_on_values, cq.position,
      co.value as option_value, co.label as option_label
    from chat_questions cq
    left join chat_question_options co on co.chat_question_id = cq.id
    where cq.service_type_id = ${serviceId}
    order by cq.position, co.position
  `;

  const byId = new Map<string, ChatQuestion>();
  const order: string[] = [];
  for (const r of rows) {
    if (!byId.has(r.id)) {
      order.push(r.id);
      byId.set(r.id, {
        id: r.id,
        key: r.key,
        prompt: r.prompt,
        fieldType: r.field_type,
        leadField: r.lead_field,
        dependsOnKey: r.depends_on_key,
        dependsOnMode: r.depends_on_mode,
        dependsOnValues: r.depends_on_values,
        position: r.position,
        options: [],
      });
    }
    if (r.option_value !== null) {
      byId.get(r.id)!.options.push({ value: r.option_value, label: r.option_label ?? r.option_value });
    }
  }
  return order.map((id) => byId.get(id)!);
}

export async function getChatServiceDetail(ctx: SessionContext, serviceId: string): Promise<ChatServiceDetail | null> {
  requireManager(ctx);
  const [service] = await sql<
    { id: string; key: string; name: string; corporate_only: boolean; is_active: boolean }[]
  >`
    select id, key, name, corporate_only, is_active from service_types where id = ${serviceId}
  `;
  if (!service) return null;

  const questions = await getServiceQuestions(serviceId);

  return {
    id: service.id,
    key: service.key,
    name: service.name,
    corporateOnly: service.corporate_only,
    isActive: service.is_active,
    questionCount: questions.length,
    questions,
  };
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "service";
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const [existing] = await sql<{ id: string }[]>`select id from service_types where key = ${candidate}`;
    if (!existing) return candidate;
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
}

export type CreateChatServiceInput = { name: string; corporateOnly: boolean };

export async function createChatService(ctx: SessionContext, input: CreateChatServiceInput): Promise<{ serviceId: string }> {
  requireManager(ctx);
  const name = input.name.trim();
  if (!name) throw new Error("Service name is required.");
  const key = await uniqueSlug(name);

  const [service] = await sql<{ id: string }[]>`
    insert into service_types (key, name, corporate_only) values (${key}, ${name}, ${input.corporateOnly})
    returning id
  `;
  const serviceId = service.id;

  // Auto-seed the 4 required closing questions — see REQUIRED_SYSTEM_KEYS.
  await sql`
    insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
      (${serviceId}, 'full_name', ${"What's your full name?"}, 'text', 'full_name', 100),
      (${serviceId}, 'contact_email', ${"What's the best email to reach you at?"}, 'email', 'contact_email', 101),
      (${serviceId}, 'contact_phone', ${"And a phone number where we can reach you?"}, 'phone', 'contact_phone', 102),
      (${serviceId}, 'consent_to_contact', ${"Do you consent to being contacted about this?"}, 'boolean', 'consent_to_contact', 103)
  `;

  return { serviceId };
}

export type UpdateChatServiceInput = { name: string; corporateOnly: boolean };

export async function updateChatService(ctx: SessionContext, serviceId: string, input: UpdateChatServiceInput): Promise<void> {
  requireManager(ctx);
  const name = input.name.trim();
  if (!name) throw new Error("Service name is required.");

  if (input.corporateOnly) {
    const [service] = await sql<{ key: string; corporate_only: boolean }[]>`
      select key, corporate_only from service_types where id = ${serviceId}
    `;
    if (service && !service.corporate_only) {
      const [providerUsing] = await sql<{ id: string }[]>`
        select id from service_providers where ${service.key} = any(service_types) limit 1
      `;
      if (providerUsing) {
        throw new Error(
          "Can't mark this corporate-only — one or more service providers currently list it as a service they handle. Edit those providers first.",
        );
      }
    }
  }

  await sql`
    update service_types set name = ${name}, corporate_only = ${input.corporateOnly} where id = ${serviceId}
  `;
}

export async function toggleChatServiceActive(ctx: SessionContext, serviceId: string): Promise<void> {
  requireManager(ctx);
  await sql`update service_types set is_active = not is_active where id = ${serviceId}`;
}

export type DependsOnInput = { key: string; mode: "equals" | "one_of"; values: string[] } | null;

export type ChatQuestionInput = {
  key: string;
  prompt: string;
  fieldType: QuestionFieldType;
  leadField: LeadFieldOption | null;
  options: ChatQuestionOption[];
  dependsOn: DependsOnInput;
};

async function validateQuestionInput(
  serviceId: string,
  input: ChatQuestionInput,
  position: number,
  excludeQuestionId: string | null,
): Promise<void> {
  if (!FIELD_TYPES.has(input.fieldType)) throw new Error("Invalid field type.");
  if (input.leadField && !LEAD_FIELD_OPTIONS.has(input.leadField)) throw new Error("Invalid lead field.");
  if (!input.key.trim()) throw new Error("Key is required.");
  if (!input.prompt.trim()) throw new Error("Prompt is required.");

  if (input.fieldType === "enum" && input.options.length === 0) {
    throw new Error("An enum question needs at least one option.");
  }
  const values = new Set(input.options.map((o) => o.value));
  if (values.size !== input.options.length) {
    throw new Error("Option values must be unique within a question.");
  }

  if (input.dependsOn) {
    const rows = await sql<{ id: string; field_type: QuestionFieldType; position: number }[]>`
      select id, field_type, position from chat_questions
      where service_type_id = ${serviceId} and key = ${input.dependsOn.key}
    `;
    const target = rows[0];
    if (!target) throw new Error("The question this depends on doesn't exist in this service.");
    if (target.field_type !== "enum" && target.field_type !== "boolean") {
      throw new Error("A question can only depend on an earlier enum or boolean question.");
    }
    if (excludeQuestionId && target.id === excludeQuestionId) {
      throw new Error("A question can't depend on itself.");
    }
    if (target.position >= position) {
      throw new Error(
        `"${input.dependsOn.key}" must come before this question in the order — give it a lower "Order" number, or move this one later.`,
      );
    }

    if (target.field_type === "boolean") {
      const validBoolValues = ["true", "false"];
      if (input.dependsOn.values.some((v) => !validBoolValues.includes(v))) {
        throw new Error("A dependency on a boolean question must use true/false values.");
      }
    } else {
      const targetOptions = await sql<{ value: string }[]>`
        select value from chat_question_options where chat_question_id = ${target.id}
      `;
      const targetValues = new Set(targetOptions.map((o) => o.value));
      if (input.dependsOn.values.some((v) => !targetValues.has(v))) {
        throw new Error("The dependency uses a value that isn't one of that question's options.");
      }
    }

    if (input.dependsOn.mode === "equals" && input.dependsOn.values.length !== 1) {
      throw new Error("'Equals' needs exactly one value.");
    }
    if (input.dependsOn.mode === "one_of" && input.dependsOn.values.length === 0) {
      throw new Error("'One of' needs at least one value.");
    }
  }
}

/**
 * Re-checks every OTHER question in the service whose depends_on_key
 * references `key` still has a valid, strictly-earlier position — called
 * after any position change so a reorder can't silently break an existing
 * dependency without a clear error.
 */
async function assertDependentsStillValid(serviceId: string, key: string, newPosition: number): Promise<void> {
  const dependents = await sql<{ key: string }[]>`
    select key from chat_questions
    where service_type_id = ${serviceId} and depends_on_key = ${key} and position <= ${newPosition}
  `;
  if (dependents.length > 0) {
    throw new Error(
      `Can't save — "${dependents[0].key}" depends on this question and must come after it. Adjust positions first.`,
    );
  }
}

export async function createChatQuestion(
  ctx: SessionContext,
  serviceId: string,
  input: ChatQuestionInput & { position: number },
): Promise<{ questionId: string }> {
  requireManager(ctx);
  await validateQuestionInput(serviceId, input, input.position, null);

  const [existing] = await sql<{ id: string }[]>`
    select id from chat_questions where service_type_id = ${serviceId} and key = ${input.key}
  `;
  if (existing) throw new Error("A question with this key already exists in this service.");

  const [question] = await sql<{ id: string }[]>`
    insert into chat_questions (
      service_type_id, key, prompt, field_type, lead_field,
      depends_on_key, depends_on_mode, depends_on_values, position
    ) values (
      ${serviceId}, ${input.key}, ${input.prompt}, ${input.fieldType}, ${input.leadField},
      ${input.dependsOn?.key ?? null}, ${input.dependsOn?.mode ?? null},
      ${input.dependsOn ? input.dependsOn.values : null}, ${input.position}
    )
    returning id
  `;

  if (input.fieldType === "enum" && input.options.length > 0) {
    for (let i = 0; i < input.options.length; i++) {
      await sql`
        insert into chat_question_options (chat_question_id, value, label, position)
        values (${question.id}, ${input.options[i].value}, ${input.options[i].label}, ${i})
      `;
    }
  }

  return { questionId: question.id };
}

export async function updateChatQuestion(
  ctx: SessionContext,
  questionId: string,
  input: ChatQuestionInput & { position: number },
): Promise<void> {
  requireManager(ctx);
  const [current] = await sql<{ id: string; service_type_id: string; key: string; field_type: QuestionFieldType }[]>`
    select id, service_type_id, key, field_type from chat_questions where id = ${questionId}
  `;
  if (!current) throw new Error("Question not found.");

  await validateQuestionInput(current.service_type_id, input, input.position, questionId);

  if (
    current.field_type !== input.fieldType &&
    (current.field_type === "enum" || current.field_type === "boolean") &&
    (input.fieldType !== "enum" && input.fieldType !== "boolean")
  ) {
    const [dependent] = await sql<{ key: string }[]>`
      select key from chat_questions where depends_on_key = ${current.key} and service_type_id = ${current.service_type_id} limit 1
    `;
    if (dependent) {
      throw new Error(`Can't change this question's type — "${dependent.key}" depends on it.`);
    }
  }

  await assertDependentsStillValid(current.service_type_id, current.key, input.position);

  await sql`
    update chat_questions set
      prompt = ${input.prompt},
      field_type = ${input.fieldType},
      lead_field = ${input.leadField},
      depends_on_key = ${input.dependsOn?.key ?? null},
      depends_on_mode = ${input.dependsOn?.mode ?? null},
      depends_on_values = ${input.dependsOn ? input.dependsOn.values : null},
      position = ${input.position}
    where id = ${questionId}
  `;

  if (input.fieldType === "enum") {
    const existingOptions = await sql<{ value: string }[]>`
      select value from chat_question_options where chat_question_id = ${questionId}
    `;
    const existingValues = new Set(existingOptions.map((o) => o.value));
    const newValues = new Set(input.options.map((o) => o.value));

    for (const existing of existingOptions) {
      if (!newValues.has(existing.value)) {
        const [dependent] = await sql<{ key: string }[]>`
          select key from chat_questions
          where service_type_id = ${current.service_type_id} and ${existing.value} = any(depends_on_values)
          limit 1
        `;
        if (dependent) {
          throw new Error(`Can't remove option "${existing.value}" — "${dependent.key}" depends on it.`);
        }
        await sql`delete from chat_question_options where chat_question_id = ${questionId} and value = ${existing.value}`;
      }
    }

    for (let i = 0; i < input.options.length; i++) {
      const opt = input.options[i];
      if (existingValues.has(opt.value)) {
        await sql`
          update chat_question_options set label = ${opt.label}, position = ${i}
          where chat_question_id = ${questionId} and value = ${opt.value}
        `;
      } else {
        await sql`
          insert into chat_question_options (chat_question_id, value, label, position)
          values (${questionId}, ${opt.value}, ${opt.label}, ${i})
        `;
      }
    }
  } else {
    await sql`delete from chat_question_options where chat_question_id = ${questionId}`;
  }
}

export async function deleteChatQuestion(ctx: SessionContext, questionId: string): Promise<void> {
  requireManager(ctx);
  const [question] = await sql<{ key: string; service_type_id: string }[]>`
    select key, service_type_id from chat_questions where id = ${questionId}
  `;
  if (!question) return;

  if (REQUIRED_SYSTEM_KEYS.has(question.key)) {
    throw new Error("This question is required and can't be deleted.");
  }

  const [dependent] = await sql<{ key: string }[]>`
    select key from chat_questions where depends_on_key = ${question.key} and service_type_id = ${question.service_type_id} limit 1
  `;
  if (dependent) {
    throw new Error(`Can't delete — "${dependent.key}" depends on this question.`);
  }

  await sql`delete from chat_questions where id = ${questionId}`;
}
