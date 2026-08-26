import { localDateString, localTimeLabel } from '@/lib/analytics/timeframe';

export type TrendPoint = {
  date: string;
  value: number;
  label: string;
};

type Sample = { at: number; value: number };

/** In-session samples so Today charts grow a trail as spend refreshes. */
let sampleDay: string | null = null;
let samples: Sample[] = [];

const MIN_GAP_MS = 30_000;

function startOfLocalDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function ensureDay(now: Date) {
  const day = localDateString(now);
  const dayStart = startOfLocalDay(now);
  if (sampleDay !== day) {
    sampleDay = day;
    samples = [{ at: dayStart, value: 0 }];
  } else if (samples.length === 0 || samples[0].at !== dayStart) {
    samples = [{ at: dayStart, value: 0 }, ...samples.filter((s) => s.at > dayStart)];
  }
  return dayStart;
}

/** Call whenever live Today spend is fetched / refreshed. */
export function recordTodaySpendSample(liveSpend: number, now = new Date()) {
  const dayStart = ensureDay(now);
  const at = Math.max(now.getTime(), dayStart);
  const value = Math.max(0, liveSpend);
  const last = samples[samples.length - 1];

  // Still on the midnight anchor — only add a real point once we leave midnight
  // or spend becomes non-zero / enough time has passed.
  if (last.at === dayStart) {
    if (at - dayStart < MIN_GAP_MS && value === 0) return;
    samples.push({ at, value });
    return;
  }

  if (at - last.at < MIN_GAP_MS) {
    last.value = value;
    last.at = at;
    return;
  }

  samples.push({ at, value });

  if (samples.length > 48) {
    samples = [samples[0], ...samples.slice(samples.length - 47)];
  }
}

/**
 * Today spend series: local midnight ($0) → session samples → now (live).
 * Activity API has no intraday buckets; spend is /key usage_daily.
 */
export function buildTodayTrendSeries(
  liveSpend: number,
  now = new Date()
): TrendPoint[] {
  recordTodaySpendSample(liveSpend, now);
  const dayStart = startOfLocalDay(now);
  const at = Math.max(now.getTime(), dayStart + 60_000);
  const endLabel = localTimeLabel(now);
  const value = Math.max(0, liveSpend);

  const points: TrendPoint[] = samples.map((s) => ({
    date: new Date(s.at).toISOString(),
    value: s.value,
    label: s.at === dayStart ? '12:00 AM' : localTimeLabel(new Date(s.at)),
  }));

  // Always end at "now" so labels read midnight → current time
  const tip = points[points.length - 1];
  if (points.length === 1) {
    points.push({
      date: new Date(at).toISOString(),
      value,
      label: endLabel === '12:00 AM' ? 'now' : endLabel,
    });
  } else if (tip) {
    tip.value = value;
    tip.label = endLabel === tip.label && tip.label === '12:00 AM' ? 'now' : endLabel;
    tip.date = new Date(at).toISOString();
  }

  return points;
}

export function resetTodayTrailForTests() {
  sampleDay = null;
  samples = [];
}
