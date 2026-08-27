/** LimeBoard owner accounts — unlock Pro + screenshot preview without tying to an API key. */
const ADMIN_ACCOUNT_EMAILS = ['will@safetytat.co'] as const;

export function isAdminAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_ACCOUNT_EMAILS.some((admin) => admin === normalized);
}
