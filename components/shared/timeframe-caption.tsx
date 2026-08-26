import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { spacing } from '@/constants/theme';
import { getTimeframeDefinition, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  timeframe: TimeframeId;
  dataSource?: 'activity' | 'live_key';
};

export function TimeframeCaption({ timeframe, dataSource }: Props) {
  const def = getTimeframeDefinition(timeframe);

  return (
    <Panel style={{ gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
      <AppText variant="caption">{def.windowDescription}</AppText>
      <AppText variant="caption">{def.dataNote}</AppText>
      {dataSource === 'live_key' ? (
        <AppText variant="caption" color="#A3E635">
          Spend · live from /key usage_daily (OpenRouter’s current UTC day counter)
        </AppText>
      ) : null}
    </Panel>
  );
}
