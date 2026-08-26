import { ActivityIndicator, View } from 'react-native';
import { Sparkline } from '@/components/charts/charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { usePlatformRankings } from '@/hooks/use-platform-rankings';
import {
  formatTokenCount,
  shortModelSlug,
  type PlatformRankingRow,
} from '@/lib/platform/rankings';

type Props = {
  compact?: boolean;
};

export function PlatformPulse({ compact }: Props) {
  const { data, isLoading, isError } = usePlatformRankings();

  return (
    <Panel style={{ gap: spacing.md }}>
      <View style={{ gap: 4 }}>
        <AppText variant="label" color={colors.limeSoft}>
          Platform pulse
        </AppText>
        {!compact ? (
          <>
            <AppText variant="title">OpenRouter ecosystem</AppText>
            <AppText variant="caption">
              Daily model rankings across the platform — no API key required.
            </AppText>
          </>
        ) : (
          <AppText variant="caption">Ecosystem rankings · cached daily</AppText>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.limeSoft} />
      ) : isError || !data ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Platform stats are syncing. Check back soon or connect your key for personal
          metrics.
        </AppText>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label">Latest day</AppText>
              <AppText variant="mono">{data.date}</AppText>
              <AppText variant="caption">
                {formatTokenCount(data.totalTokens)} tokens · {data.leaderModel} leads at{' '}
                {Math.round(data.leaderShare * 100)}%
              </AppText>
            </View>
            <Sparkline
              values={topModelSparkline(data.rows)}
              width={120}
              height={44}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="label">Top models</AppText>
            {topModels(data.rows)
              .slice(0, 5)
              .map((row, index) => (
                <View
                  key={row.model_permaslug}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  <AppText variant="caption" color={colors.textSecondary}>
                    {index + 1}. {shortModelSlug(row.model_permaslug)}
                  </AppText>
                  <AppText variant="mono" style={{ fontSize: 12 }}>
                    {formatTokenCount(row.total_tokens)}
                  </AppText>
                </View>
              ))}
          </View>

          {data.syncedAt ? (
            <AppText variant="caption" color={colors.textMuted}>
              Updated {new Date(data.syncedAt).toLocaleString()}
            </AppText>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function topModels(rows: PlatformRankingRow[]) {
  return rows.filter((r) => !r.is_other).sort((a, b) => b.total_tokens - a.total_tokens);
}

function topModelSparkline(rows: PlatformRankingRow[]): number[] {
  return topModels(rows)
    .slice(0, 8)
    .map((r) => r.total_tokens)
    .reverse();
}
