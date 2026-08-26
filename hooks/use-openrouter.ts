import { useQuery } from '@tanstack/react-query';

import {
  analyticsDimensionId,
  analyticsGranularity,
  analyticsMetricId,
  analyticsTimeRange,
  needsAnalyticsApi,
} from '@/lib/analytics/analytics-query';
import type {
  ExploreGroupBy,
  ExploreMetric,
  ExploreRollup,
} from '@/lib/analytics/explore';
import type { TimeframeId } from '@/lib/analytics/timeframe';
import {
  getActivity,
  getCredits,
  getCurrentKey,
  listKeys,
  queryAnalytics,
  type AnalyticsQueryBody,
} from '@/lib/openrouter/client';
import { useAuth } from '@/providers/auth-provider';

export function useKeyInfo() {
  const { apiKey } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'key', apiKey],
    queryFn: () => getCurrentKey(apiKey!),
    enabled: Boolean(apiKey),
  });
}

export function useCredits() {
  const { apiKey } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'credits', apiKey],
    queryFn: () => getCredits(apiKey!),
    enabled: Boolean(apiKey),
  });
}

export function useActivity() {
  const { apiKey, meta } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'activity', apiKey],
    queryFn: () => getActivity(apiKey!),
    enabled: Boolean(apiKey) && Boolean(meta?.isManagementKey),
    retry: false,
  });
}

export function useManagedKeys() {
  const { apiKey, meta } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'keys', apiKey],
    queryFn: () => listKeys(apiKey!),
    enabled: Boolean(apiKey) && Boolean(meta?.isManagementKey),
    retry: false,
  });
}

type AnalyticsSeriesArgs = {
  metric: ExploreMetric;
  groupBy: ExploreGroupBy;
  rollup: ExploreRollup;
  timeframe: TimeframeId;
  /** When true, include groupBy dimension (stacked charts). */
  withDimension?: boolean;
};

export function useAnalyticsSeries({
  metric,
  groupBy,
  rollup,
  timeframe,
  withDimension = false,
}: AnalyticsSeriesArgs) {
  const { apiKey, meta } = useAuth();
  const enabled =
    Boolean(apiKey) &&
    Boolean(meta?.isManagementKey) &&
    needsAnalyticsApi(rollup);

  const granularity = analyticsGranularity(rollup)!;
  const metricId = analyticsMetricId(metric);
  const dimension = analyticsDimensionId(groupBy);

  return useQuery({
    queryKey: [
      'openrouter',
      'analytics',
      apiKey,
      metric,
      groupBy,
      rollup,
      timeframe,
      withDimension,
    ],
    queryFn: async () => {
      const range = analyticsTimeRange(timeframe);
      const body: AnalyticsQueryBody = {
        metrics: [metricId],
        granularity,
        time_range: { start: range.start, end: range.end },
        order_by: { field: 'date', direction: 'asc' },
        limit: 10_000,
      };
      if (withDimension) {
        body.dimensions = [dimension];
      }
      const result = await queryAnalytics(apiKey!, body);
      return {
        ...result,
        rangeNote: range.note,
        metricId,
        dimension,
        granularity,
      };
    },
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}
