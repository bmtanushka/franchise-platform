"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import {
  createChatService,
  updateChatService,
  toggleChatServiceActive,
  createChatQuestion,
  updateChatQuestion,
  deleteChatQuestion,
  type QuestionFieldType,
  type LeadFieldOption,
  type ChatQuestionOption,
  type DependsOnInput,
} from "@/lib/db/chat-services";

export type ChatServiceFormState = { error: string | null };

function parseOptions(formData: FormData): ChatQuestionOption[] {
  const raw = formData.get("options");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o) => o && typeof o.value === "string" && typeof o.label === "string" && o.value.trim() && o.label.trim())
      .map((o) => ({ value: String(o.value).trim(), label: String(o.label).trim() }));
  } catch {
    return [];
  }
}

function parseDependsOn(formData: FormData): DependsOnInput {
  const raw = formData.get("dependsOn");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    if (!parsed || !parsed.key) return null;
    return {
      key: String(parsed.key),
      mode: parsed.mode === "one_of" ? "one_of" : "equals",
      values: Array.isArray(parsed.values) ? parsed.values.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function createChatServiceAction(
  _prevState: ChatServiceFormState,
  formData: FormData,
): Promise<ChatServiceFormState> {
  const ctx = await requireSessionContext();
  let serviceId: string;
  try {
    const result = await createChatService(ctx, {
      name: String(formData.get("name")).trim(),
      corporateOnly: formData.get("corporateOnly") === "on",
    });
    serviceId = result.serviceId;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong creating this service." };
  }
  revalidatePath("/dashboard/chat-services");
  redirect(`/dashboard/chat-services/${serviceId}`);
}

export async function updateChatServiceAction(
  _prevState: ChatServiceFormState,
  formData: FormData,
): Promise<ChatServiceFormState> {
  const ctx = await requireSessionContext();
  const serviceId = String(formData.get("serviceId"));
  try {
    await updateChatService(ctx, serviceId, {
      name: String(formData.get("name")).trim(),
      corporateOnly: formData.get("corporateOnly") === "on",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong saving this service." };
  }
  revalidatePath(`/dashboard/chat-services/${serviceId}`);
  redirect(`/dashboard/chat-services/${serviceId}`);
}

export async function toggleChatServiceActiveAction(serviceId: string): Promise<{ error: string | null }> {
  const ctx = await requireSessionContext();
  try {
    await toggleChatServiceActive(ctx, serviceId);
    revalidatePath(`/dashboard/chat-services/${serviceId}`);
    revalidatePath("/dashboard/chat-services");
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update service." };
  }
}

export async function createChatQuestionAction(
  _prevState: ChatServiceFormState,
  formData: FormData,
): Promise<ChatServiceFormState> {
  const ctx = await requireSessionContext();
  const serviceId = String(formData.get("serviceId"));
  const fieldType = String(formData.get("fieldType")) as QuestionFieldType;
  const leadFieldRaw = String(formData.get("leadField") || "");

  try {
    await createChatQuestion(ctx, serviceId, {
      key: String(formData.get("key")).trim(),
      prompt: String(formData.get("prompt")).trim(),
      fieldType,
      leadField: leadFieldRaw ? (leadFieldRaw as LeadFieldOption) : null,
      options: parseOptions(formData),
      dependsOn: parseDependsOn(formData),
      position: Number(formData.get("position")) || 0,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong adding this question." };
  }
  revalidatePath(`/dashboard/chat-services/${serviceId}`);
  redirect(`/dashboard/chat-services/${serviceId}`);
}

export async function updateChatQuestionAction(
  _prevState: ChatServiceFormState,
  formData: FormData,
): Promise<ChatServiceFormState> {
  const ctx = await requireSessionContext();
  const serviceId = String(formData.get("serviceId"));
  const questionId = String(formData.get("questionId"));
  const fieldType = String(formData.get("fieldType")) as QuestionFieldType;
  const leadFieldRaw = String(formData.get("leadField") || "");

  try {
    await updateChatQuestion(ctx, questionId, {
      key: String(formData.get("key")).trim(),
      prompt: String(formData.get("prompt")).trim(),
      fieldType,
      leadField: leadFieldRaw ? (leadFieldRaw as LeadFieldOption) : null,
      options: parseOptions(formData),
      dependsOn: parseDependsOn(formData),
      position: Number(formData.get("position")) || 0,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong saving this question." };
  }
  revalidatePath(`/dashboard/chat-services/${serviceId}`);
  redirect(`/dashboard/chat-services/${serviceId}`);
}

export async function deleteChatQuestionAction(questionId: string, serviceId: string): Promise<{ error: string | null }> {
  const ctx = await requireSessionContext();
  try {
    await deleteChatQuestion(ctx, questionId);
    revalidatePath(`/dashboard/chat-services/${serviceId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete question." };
  }
}
