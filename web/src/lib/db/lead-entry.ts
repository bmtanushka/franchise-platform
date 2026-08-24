import { sql } from "./client";
import { withTenantContext, type SessionContext } from "./context";
import { getServiceQuestions, type ChatQuestion } from "./chat-services";

// Manual, phone-call-style lead entry from a franchisee's own dashboard —
// same services/questions/depends_on the chat agent uses, but franchisor/
// super_admin already have a full-platform Leads view and this is
// specifically "a franchisee typing up a call they just took," so it's
// scoped to that one role, matching how the user asked for it.
const LEAD_ENTRY_ROLES = new Set(["franchisee"]);

function requireFranchisee(ctx: SessionContext) {
  if (!LEAD_ENTRY_ROLES.has(ctx.role)) {
    throw new Error("Not authorized to submit a lead this way.");
  }
}

export type LeadEntryService = {
  id: string;
  key: string;
  name: string;
  questions: ChatQuestion[];
};

/**
 * Every service a franchisee can submit a lead for, each with its full
 * question list already attached — fetched once so the form can switch
 * between services entirely client-side, no per-service round trip.
 * Excludes corporate_only/inactive services the same way the chat agent's
 * franchisee-site offering does (franchise_interest etc. — a franchisee
 * submitting on behalf of a caller should see exactly what that caller
 * would have been asked in the chat widget, nothing more).
 */
export async function listLeadEntryServices(ctx: SessionContext): Promise<LeadEntryService[]> {
  requireFranchisee(ctx);
  const services = await sql<{ id: string; key: string; name: string }[]>`
    select id, key, name from service_types where is_active and not corporate_only order by created_at
  `;
  const withQuestions = await Promise.all(
    services.map(async (s) => ({ ...s, questions: await getServiceQuestions(s.id) })),
  );
  return withQuestions;
}

async function assertServiceOffered(serviceId: string): Promise<void> {
  const [service] = await sql<{ corporate_only: boolean; is_active: boolean }[]>`
    select corporate_only, is_active from service_types where id = ${serviceId}
  `;
  if (!service || service.corporate_only || !service.is_active) {
    throw new Error("That service isn't available for manual lead entry.");
  }
}

function isQuestionVisible(question: ChatQuestion, answers: Record<string, string>): boolean {
  if (!question.dependsOnKey || !question.dependsOnMode || !question.dependsOnValues) return true;
  const value = answers[question.dependsOnKey];
  if (question.dependsOnMode === "equals") return value === question.dependsOnValues[0];
  return question.dependsOnValues.includes(value);
}

/**
 * `answers` values are always strings straight off the form — including
 * boolean fields, submitted as the literal "true"/"false" (matching how
 * depends_on_values is already stored, so comparing them needs no type
 * coercion here, unlike the chat agent's Python path where a boolean
 * answer is a real bool and depends_on_values needed converting to match
 * it — see agent/app/db.py's get_questions_for_service). Coercion to a
 * real JSON boolean happens only at the point of writing to leads.details
 * below, to match the shape the chat path already produces there.
 */
export async function createLeadFromEntry(
  ctx: SessionContext,
  serviceId: string,
  answers: Record<string, string>,
): Promise<{ leadId: string }> {
  requireFranchisee(ctx);
  if (!ctx.tenantId) throw new Error("No tenant context.");
  await assertServiceOffered(serviceId);

  const questions = await getServiceQuestions(serviceId);

  const leadFields: Record<string, string | boolean> = {};
  const details: Record<string, string | boolean> = {};

  for (const q of questions) {
    if (!isQuestionVisible(q, answers)) continue;
    const raw = answers[q.key];
    if (raw === undefined || raw === null || raw.trim() === "") {
      throw new Error(`"${q.prompt}" is required.`);
    }
    const value: string | boolean = q.fieldType === "boolean" ? raw === "true" : raw;
    if (q.leadField) {
      leadFields[q.leadField] = value;
    } else {
      details[q.key] = value;
    }
  }

  const leadId = await withTenantContext(ctx, async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into leads (
        tenant_id, service_type_id, status, full_name, contact_email,
        contact_phone, postcode, consent_to_contact, details
      ) values (
        ${ctx.tenantId}, ${serviceId}, 'qualified',
        ${(leadFields.full_name as string) ?? null}, ${(leadFields.contact_email as string) ?? null},
        ${(leadFields.contact_phone as string) ?? null}, ${(leadFields.postcode as string) ?? null},
        ${Boolean(leadFields.consent_to_contact)}, ${sql.json(details)}
      )
      returning id
    `;
    await tx`
      insert into lead_status_history (lead_id, status, changed_by, note)
      values (${row.id}, 'qualified', ${ctx.userId}, 'Captured via franchisee portal (manual entry)')
    `;
    return row.id;
  });

  return { leadId };
}
