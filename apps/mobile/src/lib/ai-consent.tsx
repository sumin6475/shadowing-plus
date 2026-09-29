import { useState } from "react";
import { Alert } from "react-native";

import { AiConsentScreen } from "@/screens/ai-consent";

import { useAuth } from "./auth";
import { supabase } from "./supabase";

export const AI_CONSENT_VERSION = "2026-09-01";

type AiConsentMetadata = {
  ai_processing_consent?: boolean;
  ai_processing_consent_version?: string;
};

export type AiProcessingConsent = "allowed" | "denied" | "unset";

export function aiProcessingConsentFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AiProcessingConsent {
  const value = (metadata ?? {}) as AiConsentMetadata;
  if (value.ai_processing_consent_version !== AI_CONSENT_VERSION) return "unset";
  return value.ai_processing_consent === true ? "allowed" : "denied";
}

export async function aiProcessingAllowed(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return aiProcessingConsentFromMetadata(session?.user.user_metadata) === "allowed";
}

export class AiProcessingConsentRequiredError extends Error {
  constructor() {
    super("AI processing is off. Turn it on in Settings → Privacy to use this feature.");
    this.name = "AiProcessingConsentRequiredError";
  }
}

export async function requireAiProcessingConsent(): Promise<void> {
  if (!(await aiProcessingAllowed())) throw new AiProcessingConsentRequiredError();
}

export async function setAiProcessingConsent(allowed: boolean): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      ai_processing_consent: allowed,
      ai_processing_consent_version: AI_CONSENT_VERSION,
      ai_processing_consent_at: allowed ? new Date().toISOString() : null,
    },
  });
  if (error) throw error;
}

/**
 * Shows the consent screen once for each signed-in account whose current
 * consent version is unset. The choice is stored in Supabase user metadata so
 * it follows the account across devices and can be changed later from
 * Settings → Privacy. The screen can't be dismissed without a choice; if saving
 * fails it stays up and says so.
 */
export function AiProcessingConsentPrompt() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const consent = aiProcessingConsentFromMetadata(session?.user.user_metadata);
  // Hide as soon as a choice is saved, before the refreshed session arrives.
  const [decidedFor, setDecidedFor] = useState<string | null>(null);

  const visible = Boolean(userId) && consent === "unset" && decidedFor !== userId;

  const decide = async (allowed: boolean) => {
    try {
      await setAiProcessingConsent(allowed);
      setDecidedFor(userId);
    } catch {
      Alert.alert("Couldn’t save your choice", "Check your connection and try again.");
    }
  };

  return <AiConsentScreen visible={visible} onDecide={decide} />;
}
