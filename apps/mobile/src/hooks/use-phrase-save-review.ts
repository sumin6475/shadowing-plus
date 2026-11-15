import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";
import type { PhraseSaveReview } from "@/components/phrase-save-review-sheet";
import { createPhrase, findSavedPhraseMatches, reuseSavedPhrase, type CreatePhraseInput } from "@/lib/phrases";

/** All capture and Ask save entry points await the same read-only preflight. */
export function usePhraseSaveReview() {
  const [review, setReview] = useState<PhraseSaveReview | null>(null);
  const resolveReview = useRef<((confirmed: boolean) => void) | null>(null);
  const decision = useRef(false);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      resolveReview.current?.(false);
      resolveReview.current = null;
    };
  }, []);

  const finishDismissal = () => {
    resolveReview.current?.(decision.current);
    resolveReview.current = null;
  };
  const settle = (confirmed: boolean) => {
    decision.current = confirmed;
    setReview(null);
    // On iOS, wait for dismissal before presenting the saved-success modal.
    if (Platform.OS !== "ios") finishDismissal();
  };
  const savePhrase = async (rawInput: CreatePhraseInput) => {
    if (busy.current) return null;
    busy.current = true;
    try {
      const input = { ...rawInput, text: rawInput.text.replace(/\s+/g, " ").trim().slice(0, 240) };
      Keyboard.dismiss();
      const matches = await findSavedPhraseMatches(input.text);
      if (!alive.current) return null;
      if (matches.length) {
        const confirmed = await new Promise<boolean>(resolve => {
          resolveReview.current = resolve;
          setReview({ text: input.text, matches });
        });
        if (!confirmed || !alive.current) return null;
        const exact = matches.find(item => item.match === "exact");
        if (exact) return await reuseSavedPhrase(exact.id, input);
      }
      return await createPhrase(input);
    } finally {
      busy.current = false;
    }
  };
  return { savePhrase, review, onConfirm: () => settle(true), onEdit: () => settle(false), onDismiss: finishDismissal };
}
