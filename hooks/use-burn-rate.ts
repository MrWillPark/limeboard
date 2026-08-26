import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  computeSpendBurnRate,
  computeTokenBurnRate,
  minuteBucketsFromAnalyticsRows,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';
import { analyticsTimeRange } from '@/lib/analytics/analytics-query';
import { getCurrentKey, queryAnalytics } from '@/lib/openrouter/client';
import { useAuth } from '@/providers/auth-provider';

const POLL_MS = 20_000;

const EMPTY: BurnRateSnapshot = {
  mode: 'tokens',
  currentPerSecond: 0,
  peakPerSecond: 0,
  avgPerSecond: 0,
  historyPerMinute: [],
  lastUpdated: null,
  sourceLabel: '—',
  lagNote: null,
};

type Args = {
  enabled?: boolean;
  isManagementKey?: boolean;
  liveSpend: number;
};

export function useBurnRate({ enabled = true, isManagementKey, liveSpend }: Args) {
  const { apiKey } = useAuth();

  const analyticsQuery = useQuery({
    queryKey: ['openrouter', 'burn-rate', 'analytics', apiKey],
    queryFn: async () => {
      const range = analyticsTimeRange('3h', 'minute');
      const result = await queryAnalytics(apiKey!, {
        metrics: ['tokens_prompt', 'tokens_completion', 'request_count'],
        granularity: 'minute',
        time_range: { start: range.start, end: range.end },
        order_by: { field: 'date', direction: 'asc' },
        limit: 10_000,
      });
      return {
        rows: result.data,
        truncated: result.metadata.truncated,
      };
    },
    enabled: Boolean(apiKey) && Boolean(isManagementKey) && enabled,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
    retry: false,
  });

  const keyPollQuery = useQuery({
    queryKey: ['openrouter', 'burn-rate', 'key-poll', apiKey],
    queryFn: () => getCurrentKey(apiKey!),
    enabled: Boolean(apiKey) && !isManagementKey && enabled,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
    retry: false,
  });

  const tokenSnapshot = useMemo(() => {
    if (!analyticsQuery.data) return null;
    const buckets = minuteBucketsFromAnalyticsRows(analyticsQuery.data.rows);
    const snapshot = computeTokenBurnRate(buckets);
    if (analyticsQuery.data.truncated) {
      return {
        ...snapshot,
        lagNote: 'Analytics truncated — rate may be low',
      };
    }
    return snapshot;
  }, [analyticsQuery.data]);

  const spendSnapshot = useMemo(() => {
    if (isManagementKey) return null;
    const polledSpend = keyPollQuery.data?.usage_daily ?? liveSpend;
    return computeSpendBurnRate(polledSpend);
  }, [isManagementKey, keyPollQuery.data?.usage_daily, liveSpend, keyPollQuery.dataUpdatedAt]);

  const snapshot = tokenSnapshot ?? spendSnapshot ?? EMPTY;

  const isLoading =
    (isManagementKey ? analyticsQuery.isLoading : keyPollQuery.isLoading) && !snapshot.lastUpdated;

  return {
    snapshot,
    isLoading,
    isFetching: analyticsQuery.isFetching || keyPollQuery.isFetching,
    error: (analyticsQuery.error ?? keyPollQuery.error) as Error | null,
    refetch: () => {
      if (isManagementKey) analyticsQuery.refetch();
      else keyPollQuery.refetch();
    },
  };
}
