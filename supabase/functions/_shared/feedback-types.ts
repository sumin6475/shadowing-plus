// Transport-only types shared by the server and mobile (type-only imports).
export type FeedbackLanguage = "en" | "ko" | "zh-Hant" | "ja" | "es" | "ru";
export type FeedbackLevel = "a2" | "b1" | "b2" | "c1";
export type FeedbackCategory =
  | "reference_clarity"
  | "sentence_boundaries"
  | "connections"
  | "verb_patterns"
  | "lexical_choice"
  | "grammar"
  | "fluency"
  | "other";
export interface CoachingProfile {
  objective: string;
  focuses: {
    category: FeedbackCategory;
    reason: string;
    source_evidence: string;
  }[];
  strategies: (
    | "name_actors"
    | "split_ideas"
    | "connect_clauses"
    | "chunk_practice"
    | "focused_retry"
  )[];
  voice: "conversational" | "professional" | "clear";
  difficulty: "simple" | "balanced";
}
export interface FeedbackEvidence {
  quote: string;
  start: number;
  end: number;
}
export interface FeedbackFinding {
  id: string;
  category: FeedbackCategory;
  title: string;
  evidence: FeedbackEvidence[];
  explanation: string;
  certainty:
    | "supported"
    | "needs_clarification"
    | "possible_transcription_issue";
  clarification_question: string | null;
  correction: string | null;
  pattern: string | null;
  practice_question: string | null;
  hint: string | null;
}
export interface FeedbackComparison {
  source_report_id: string;
  targets: {
    finding_id: string;
    outcome: "clearer" | "still_unclear" | "not_comparable";
    before: FeedbackEvidence[];
    after: FeedbackEvidence[];
    observation: string;
  }[];
}
export interface AdvancedFeedback {
  schema_version: 1;
  outcome: "feedback" | "no_target_issue" | "needs_more_speech";
  overview: {
    title: string;
    listener_view: string;
    suggested_order: string[];
    next_step: string;
  };
  findings: FeedbackFinding[];
  practice: {
    question: string;
    hints: string[];
    possible_answer: string | null;
    target_finding_ids: string[];
  };
  takeaway: string[];
  comparison: FeedbackComparison | null;
}
export interface CoachingPreferences {
  user_id: string;
  rich_text: string;
  plain_text: string;
  english_level: FeedbackLevel;
  first_language: FeedbackLanguage;
  source_revision: number;
  current_profile_version_id: string | null;
}
export interface FeedbackReport {
  id: string;
  session_id: string;
  profile_version_id: string;
  first_language: FeedbackLanguage;
  english_level: FeedbackLevel;
  status: "generating" | "ready" | "failed";
  result: AdvancedFeedback | null;
  error_code: string | null;
  lease_expires_at: string;
  created_at: string;
}
export interface FeedbackRetry {
  sourceReportId: string;
  targetFindingIds: string[];
}
