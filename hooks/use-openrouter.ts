import { useQuery } from '@tanstack/react-query';

import {
  analyticsDimensionId,
  analyticsGranularity,
  analyticsMetricId,
  analyticsTimeRange,
  chunkTimeRange,
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
  type AnalyticsQueryResult,
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Fetch Analytics rows; for long hour×dimension windows, chunk by week and merge
 * so we stay under the API row limit instead of silently truncating.
 */
async function fetchAnalyticsSeriesRows(
  apiKey: string,
  bodyBase: Omit<AnalyticsQueryBody, 'time_range'>,
  range: { start: string; end: string },
  withDimension: boolean,
  granularity: NonNullable<AnalyticsQueryBody['granularity']>
): Promise<{
  data: Record<string, string | number | null>[];
  truncated: boolean;
  rowCount: number;
}> {
  const shouldChunk =
    withDimension &&
    granularity === 'hour' &&
    new Date(range.end).getTime() - new Date(range.start).getTime() > WEEK_MS;

  const ranges = shouldChunk
    ? chunkTimeRange(range.start, range.end, WEEK_MS)
    : [{ start: range.start, end: range.end }];

  const allRows: Record<string, string | number | null>[] = [];
  let truncated = false;
  let rowCount = 0;

  for (const chunk of ranges) {
    const body: AnalyticsQueryBody = {
      ...bodyBase,
      time_range: { start: chunk.start, end: chunk.end },
      // Omit group_limit so the server auto-sizes for time×dimension series.
      limit: 10_000,
    };
    const result: AnalyticsQueryResult = await queryAnalytics(apiKey, body);
    allRows.push(...result.data);
    rowCount += result.metadata.row_count;
    if (result.metadata.truncated) truncated = true;
  }

  return { data: allRows, truncated, rowCount };
}

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
      const bodyBase: Omit<AnalyticsQueryBody, 'time_range'> = {
        metrics: [metricId],
        granularity,
        order_by: { field: 'date', direction: 'asc' },
      };
      if (withDimension) {
        bodyBase.dimensions = [dimension];
      }

      const fetched = await fetchAnalyticsSeriesRows(
        apiKey!,
        bodyBase,
        range,
        withDimension,
        granularity
      );

      // Validate metric column exists when rows are present
      if (fetched.data.length > 0 && !(metricId in fetched.data[0]!)) {
        const keys = Object.keys(fetched.data[0]!).join(', ');
        throw new Error(
          `Analytics response missing metric "${metricId}" (got: ${keys})`
        );
      }

      return {
        data: fetched.data,
        truncated: fetched.truncated,
        rowCount: fetched.rowCount,
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

/** Aggregate Overview for ranges without key counters (currently 3h only). */
export function useAnalyticsOverview(enabled: boolean) {
  const { apiKey, meta } = useAuth();

  return useQuery({
    queryKey: ['openrouter', 'analytics', 'overview', apiKey, '3h'],
    queryFn: async () => {
      const overviewRange = analyticsTimeRange('3h', 'minute');

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
        // optional metrics may be unavailable
      }

      return {
        totals,
        truncated: result.metadata.truncated,
        rangeNote: overviewRange.note,
        rangeStart: overviewRange.start,
        rangeEnd: overviewRange.end,
      };
    },
    enabled: Boolean(apiKey) && Boolean(meta?.isManagementKey) && enabled,
    retry: false,
    staleTime: 30_000,
  });
}
