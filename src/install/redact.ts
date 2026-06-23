const GONKAGATE_KEY_PATTERN = /gp-[A-Za-z0-9._-]+/g;

export function redactSecrets(text: string): string {
  return text.replaceAll(GONKAGATE_KEY_PATTERN, "gp-[REDACTED]");
}
