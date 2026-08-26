import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { Sparkline } from '@/components/charts/charts';
import { colors, spacing } from '@/constants/theme';
import {
  formatShortDate,
  formatUsd,
  type BurnSnapshot,
} from '@/lib/analytics/burn';

type Props = {
  burn: BurnSnapshot;
  series: number[];
  keyLabel?: string | null;
  isManagementKey?: boolean;
};

export function BalanceHero({ burn, series, keyLabel, isManagementKey }: Props) {
  return (
    <Panel accent style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 4, flex: 1 }}>
          <AppText variant="label" color={colors.limeSoft}>
            Credit balance
          </AppText>
          <AppText variant="monoLg" selectable>
            {formatUsd(burn.balance)}
          </AppText>
        </View>
        <Sparkline values={series.length ? series : [0, 0]} width={120} height={44} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Metric label="Today" value={formatUsd(burn.dailyBurn)} />
        <Metric label="7d" value={formatUsd(burn.weeklyBurn)} />
        <Metric label="30d" value={formatUsd(burn.monthlyBurn)} />
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="caption">
          Zero-balance estimate · {burn.runwayLabel}
          {burn.projectedZeroDate ? ` · ${formatShortDate(burn.projectedZeroDate)}` : ''}
        </AppText>
        {keyLabel ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {isManagementKey ? 'Management key' : 'API key'} · {keyLabel}
          </AppText>
        ) : null}
      </View>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="mono" selectable style={{ fontSize: 15 }}>
        {value}
      </AppText>
    </View>
  );
}
