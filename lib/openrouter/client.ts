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
  method?: 'GET' | 'POST';
  body?: unknown;
};

async function request<T>({
  apiKey,
  path,
  query,
  method = 'GET',
  body,
}: RequestOptions): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://limeboard.app',
      'X-Title': 'LimeBoard',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `OpenRouter request failed (${response.status})`;
    try {
      const bodyJson = await response.json();
      message = bodyJson?.error?.message ?? message;
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

export type AnalyticsQueryBody = {
  metrics: string[];
  dimensions?: string[];
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  time_range?: { start: string; end: string };
  order_by?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  group_limit?: number;
};

export type AnalyticsQueryResult = {
  data: Record<string, string | number | null>[];
  metadata: {
    query_time_ms: number;
    row_count: number;
    truncated: boolean;
  };
  cachedAt?: number;
  warnings?: string[];
};

/**
 * Explore-grade aggregates via POST /analytics/query.
 * Requires a management API key. Supports minute/hour/day/week/month.
 */
export async function queryAnalytics(
  apiKey: string,
  body: AnalyticsQueryBody
): Promise<AnalyticsQueryResult> {
  const res = await request<unknown>({
    apiKey,
    path: '/analytics/query',
    method: 'POST',
    body,
  });

  // Normalize { data: { data, metadata } } | { data: rows } | rows
  const root = res as Record<string, unknown>;
  const level1 = root?.data;

  if (Array.isArray(level1)) {
    return {
      data: level1 as Record<string, string | number | null>[],
      metadata: {
        query_time_ms: 0,
        row_count: level1.length,
        truncated: false,
      },
    };
  }

  if (level1 && typeof level1 === 'object') {
    const inner = level1 as Record<string, unknown>;
    if (Array.isArray(inner.data)) {
      return {
        data: inner.data as Record<string, string | number | null>[],
        metadata: (inner.metadata as AnalyticsQueryResult['metadata']) ?? {
          query_time_ms: 0,
          row_count: inner.data.length,
          truncated: false,
        },
        cachedAt: inner.cachedAt as number | undefined,
        warnings: inner.warnings as string[] | undefined,
      };
    }
  }

  if (Array.isArray(res)) {
    return {
      data: res as Record<string, string | number | null>[],
      metadata: {
        query_time_ms: 0,
        row_count: res.length,
        truncated: false,
      },
    };
  }

  return {
    data: [],
    metadata: { query_time_ms: 0, row_count: 0, truncated: false },
  };
}
