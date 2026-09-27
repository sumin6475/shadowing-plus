/** Password policy for new passwords, shown as a live checklist (signup + reset). */
export function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    number: /\d/.test(pw),
  };
}

export function passwordValid(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.length && c.case && c.number;
}
