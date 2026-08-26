import type {
  ActivityItem,
  CreditsInfo,
  KeyInfo,
  ManagedKey,
  ModelPricing,
} from './types';

const BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
  }
}

type RequestOptions = {
  apiKey: string;
  path: string;
  query?: Record<string, string | undefined>;
};

async function request<T>({ apiKey, path, query }: RequestOptions): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://limeboard.app',
      'X-Title': 'LimeBoard',
    },
  });

  if (!response.ok) {
    let message = `OpenRouter request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new OpenRouterError(message, response.status);
  }

  return response.json() as Promise<T>;
}

/** Current key balance / spend / limits — works with regular or management keys. */
export async function getCurrentKey(apiKey: string): Promise<KeyInfo> {
  const res = await request<{ data: KeyInfo }>({ apiKey, path: '/key' });
  return res.data;
}

/** Account credits + lifetime usage. */
export async function getCredits(apiKey: string): Promise<CreditsInfo> {
  const res = await request<{ data: CreditsInfo }>({ apiKey, path: '/credits' });
  return res.data;
}

/**
 * Last ~30 days of usage by model/endpoint.
 * Requires a management API key.
 */
export async function getActivity(
  apiKey: string,
  options?: { date?: string; apiKeyHash?: string }
): Promise<ActivityItem[]> {
  const res = await request<{ data: ActivityItem[] }>({
    apiKey,
    path: '/activity',
    query: {
      date: options?.date,
      api_key_hash: options?.apiKeyHash,
    },
  });
  return res.data ?? [];
}

/**
 * List provisioned keys under the account.
 * Requires a management API key.
 */
export async function listKeys(apiKey: string): Promise<ManagedKey[]> {
  const res = await request<{ data: ManagedKey[] }>({ apiKey, path: '/keys' });
  return res.data ?? [];
}

/** Public model catalog with pricing (no auth required, but we send key if present). */
export async function listModels(apiKey: string): Promise<ModelPricing[]> {
  const res = await request<{ data: ModelPricing[] }>({ apiKey, path: '/models' });
  return res.data ?? [];
}

export async function validateApiKey(apiKey: string): Promise<KeyInfo> {
  return getCurrentKey(apiKey);
}
