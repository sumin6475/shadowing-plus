import { useEffect, useRef } from "react";
import { Alert } from "react-native";

import { useAuth } from "./auth";
import { openLegalUrl, PRIVACY_POLICY_URL } from "./legal";
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
    super("AI processing is off. Turn it on in Profile → Privacy to use this feature.");
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
 * Prompts once for each signed-in account whose current consent version is
 * unset. The choice is stored in Supabase user metadata so it follows the
 * account across devices and can be changed later from Profile → Privacy.
 */
export function AiProcessingConsentPrompt() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const consent = aiProcessingConsentFromMetadata(session?.user.user_metadata);
  const promptedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      promptedUserRef.current = null;
      return;
    }
    if (consent !== "unset" || promptedUserRef.current === userId) return;
    promptedUserRef.current = userId;

    const save = (allowed: boolean, after?: () => void) => {
      setAiProcessingConsent(allowed)
        .then(after)
        .catch(() => {
          promptedUserRef.current = null;
          Alert.alert("Couldn’t save your choice", "Check your connection and try again.");
        });
    };

    Alert.alert(
      "AI feedback privacy",
      "To create feedback, Phrase Bank suggestions, photo text help, and AI pronunciation, Saylo sends the text or photo you choose to OpenAI. Speaking recordings stay on this device. Allow this processing?",
      [
        { text: "Not now", style: "cancel", onPress: () => save(false) },
        {
          text: "Privacy Policy",
          onPress: () => save(false, () => void openLegalUrl(PRIVACY_POLICY_URL)),
        },
        { text: "Allow", onPress: () => save(true) },
      ],
      { cancelable: false },
    );
  }, [consent, userId]);

  return null;
}
