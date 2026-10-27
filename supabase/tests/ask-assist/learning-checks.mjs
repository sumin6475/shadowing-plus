/** Deterministic checks for the few learning failures that have crisp edges.
 * Naturalness, meaning in context, and learner usefulness still need review. */
export function checkLearningConstraints(testCase, reply) {
  const constraints = testCase.learning_constraints ?? {};
  const failures = [];

  if (constraints.forbidden_expressions?.length) {
    const expressions = reply?.expressions ?? reply?.key_phrases ?? [];
    const forbidden = new Set(constraints.forbidden_expressions.map((value) => value.trim().toLowerCase()));
    for (const expression of expressions) {
      if (forbidden.has(expression.en?.trim().toLowerCase())) {
        failures.push(`Expression changes meaning or is unnatural: ${expression.en}`);
      }
    }
  }

  if (constraints.forbidden_expression_prefixes?.length) {
    const expressions = reply?.expressions ?? reply?.key_phrases ?? [];
    const prefixes = constraints.forbidden_expression_prefixes.map((value) => value.trim().toLowerCase());
    for (const expression of expressions) {
      if (prefixes.some((prefix) => expression.en?.trim().toLowerCase().startsWith(prefix))) {
        failures.push(`Expression is unsuitable for this situation: ${expression.en}`);
      }
    }
  }

  if (constraints.single_sentence_draft) {
    const draft = reply?.draft;
    if (!draft || draft.opening?.trim() || draft.closing?.trim()) {
      failures.push("One-sentence draft must use Body only");
    } else {
      const body = draft.body?.trim() ?? "";
      // This check is scoped to a simple self-introduction case. Human review
      // still judges whether the sentence is natural and fits the request.
      const sentences = body.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.filter((part) => part.trim()) ?? [];
      if (sentences.length !== 1) failures.push(`Expected one sentence, got ${sentences.length}`);
    }
  }

  return failures;
}
