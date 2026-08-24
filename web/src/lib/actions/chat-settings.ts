"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionContext } from "@/lib/auth/session-context";
import { updateChatSettings } from "@/lib/db/chat-settings";

export type ChatSettingsFormState = { error: string | null };

export async function updateChatSettingsAction(
  _prevState: ChatSettingsFormState,
  formData: FormData,
): Promise<ChatSettingsFormState> {
  const ctx = await requireSessionContext();
  const corporateGreeting = String(formData.get("corporateGreeting")).trim();
  const franchiseeGreeting = String(formData.get("franchiseeGreeting")).trim();

  if (!corporateGreeting || !franchiseeGreeting) {
    return { error: "Both greetings are required." };
  }

  try {
    await updateChatSettings(ctx, { corporateGreeting, franchiseeGreeting });
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong saving the chat greeting. Please try again." };
  }

  revalidatePath("/dashboard/chat-settings");
  redirect("/dashboard/chat-settings");
}
