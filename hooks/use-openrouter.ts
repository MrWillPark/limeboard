import { useQuery } from '@tanstack/react-query';

import {
  analyticsDimensionId,
  analyticsGranularity,
  analyticsMetricId,
  analyticsTimeRange,
  needsAnalyticsApi,
  rowsToOverviewTotals,
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
      'series',
      apiKey,
      metric,
      groupBy,
      rollup,
      timeframe,
      withDimension,
    ],
    queryFn: async () => {
      const range = analyticsTimeRange(timeframe, granularity);
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
        rangeStart: range.start,
        rangeEnd: range.end,
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

/** Aggregate (no granularity) for Overview KPIs in the same Analytics window. */
export function useAnalyticsOverview(
  timeframe: TimeframeId,
  rollup: ExploreRollup,
  enabledExtra = false
) {
  const { apiKey, meta } = useAuth();
  const useWindow = needsAnalyticsApi(rollup) || enabledExtra;
  const granularity = analyticsGranularity(rollup) ?? 'hour';

  return useQuery({
    queryKey: ['openrouter', 'analytics', 'overview', apiKey, timeframe, rollup],
    queryFn: async () => {
      const range = analyticsTimeRange(
        timeframe,
        needsAnalyticsApi(rollup) ? granularity : 'hour'
      );
      // For 3h with day rollup still want last-3h overview when exploring that range
      const overviewRange =
        timeframe === '3h'
          ? analyticsTimeRange('3h', 'minute')
          : range;

      const result = await queryAnalytics(apiKey!, {
        metrics: [
          'total_usage',
          'request_count',
          'tokens_prompt',
          'tokens_completion',
        ],
        time_range: { start: overviewRange.start, end: overviewRange.end },
        limit: 10,
      });

      const totals = rowsToOverviewTotals(result.data);
      // Optional extras — ignore failures by leaving at 0 if columns absent
      try {
        const extra = await queryAnalytics(apiKey!, {
          metrics: ['tokens_reasoning', 'byok_usage'],
          time_range: { start: overviewRange.start, end: overviewRange.end },
          limit: 10,
        });
        const more = rowsToOverviewTotals(extra.data);
        totals.reasoningTokens = more.reasoningTokens;
        totals.byokSpend = more.byokSpend;
      } catch {
        // optional metrics may be unavailable on some accounts
      }

      return {
        totals,
        rangeNote: overviewRange.note,
        rangeStart: overviewRange.start,
        rangeEnd: overviewRange.end,
      };
    },
    enabled: Boolean(apiKey) && Boolean(meta?.isManagementKey) && useWindow,
    retry: false,
    staleTime: 30_000,
  });
}
