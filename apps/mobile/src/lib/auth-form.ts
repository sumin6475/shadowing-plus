// auth-form.ts — pure validation for the email sign-in form. Kept free of
// React so tests/auth-form.test.mjs can run it under node --test.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Why an email can't be submitted, in the learner's words, or null when it can.
 * A space in the middle ("sumin002 @gmail.com") is the failure people actually
 * hit on a phone keyboard, so it gets its own line instead of a generic one.
 */
export function emailProblem(email: string): string | null {
  const value = email.trim();
  if (!value) return "Enter your email.";
  if (/\s/.test(value)) return "Your email has a space in it. Remove it and try again.";
  if (!value.includes("@")) return "An email address needs an @.";
  if (!isValidEmail(value)) return "That doesn’t look like a complete email address.";
  return null;
}

export function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

export function passwordMeetsChecks(password: string): boolean {
  const c = passwordChecks(password);
  return c.length && c.case && c.number;
}

/** First thing blocking submit, or null. Sign-in only needs a non-empty password. */
export function submitProblem(
  mode: "sign_in" | "sign_up",
  email: string,
  password: string,
): string | null {
  const emailIssue = emailProblem(email);
  if (emailIssue) return emailIssue;
  if (!password) return "Enter your password.";
  if (mode === "sign_up" && !passwordMeetsChecks(password)) {
    return "Your password doesn’t meet the requirements yet.";
  }
  return null;
}
