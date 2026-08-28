import { OpenRouterError } from '@/lib/openrouter/client';

/** Key revoked, malformed, or not accepted by OpenRouter. */
export function isOpenRouterAuthError(error: unknown): boolean {
  if (!(error instanceof OpenRouterError)) return false;
  if (error.status === 401) return true;
  const msg = error.message.toLowerCase();
  return msg.includes('user not found') || msg.includes('invalid') || msg.includes('unauthorized');
}

/** Transient fetch / network failure — do not delete the stored key. */
export function isOpenRouterNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('connection was lost') ||
    msg.includes('timed out')
  );
}
