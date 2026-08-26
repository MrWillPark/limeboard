import { ExplorePicker } from '@/components/explore/explore-picker';
import { TIMEFRAMES, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  value: TimeframeId;
  onChange: (id: TimeframeId) => void;
};

export function TimeframePicker({ value, onChange }: Props) {
  return (
    <ExplorePicker
      label="Timeframe"
      options={TIMEFRAMES.map((t) => ({ id: t.id, label: t.label }))}
      value={value}
      onChange={(id) => onChange(id as TimeframeId)}
    />
  );
}
