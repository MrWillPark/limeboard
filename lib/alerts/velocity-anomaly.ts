/**
 * Local velocity anomaly detection for burn rate spikes.
 * Compares recent tok/s (or $/s) against a rolling baseline.
 */

export type AnomalySample = {
  at: number;
  perSecond: number;
};

export type AnomalyConfig = {
  /** Multiplier over baseline that counts as a spike */
  multiplier: number;
  /** Minimum absolute rate before alerting (avoid noise at near-zero) */
  minAbsolutePerSecond: number;
  /** Samples needed in baseline window */
  minBaselineSamples: number;
  /** Cooldown between alerts (ms) */
  cooldownMs: number;
};

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  multiplier: 2.5,
  minAbsolutePerSecond: 50,
  minBaselineSamples: 6,
  cooldownMs: 30 * 60 * 1000,
};

export type AnomalyResult = {
  isAnomaly: boolean;
  current: number;
  baseline: number;
  ratio: number | null;
  reason: string | null;
};

export function evaluateVelocityAnomaly(
  history: AnomalySample[],
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): AnomalyResult {
  if (history.length < config.minBaselineSamples + 1) {
    return {
      isAnomaly: false,
      current: history.at(-1)?.perSecond ?? 0,
      baseline: 0,
      ratio: null,
      reason: null,
    };
  }

  const current = history[history.length - 1]!.perSecond;
  const baselineSamples = history.slice(0, -1).map((s) => s.perSecond);
  const baseline =
    baselineSamples.reduce((sum, v) => sum + v, 0) / baselineSamples.length;

  if (baseline <= 0) {
    return {
      isAnomaly: false,
      current,
      baseline,
      ratio: null,
      reason: null,
    };
  }

  const ratio = current / baseline;
  const isAnomaly =
    current >= config.minAbsolutePerSecond && ratio >= config.multiplier;

  return {
    isAnomaly,
    current,
    baseline,
    ratio,
    reason: isAnomaly
      ? `Burn ${ratio.toFixed(1)}× baseline (${formatRate(current)} vs ${formatRate(baseline)} avg)`
      : null,
  };
}

function formatRate(perSecond: number): string {
  if (perSecond >= 1000) return `${(perSecond / 1000).toFixed(1)}k/s`;
  if (perSecond >= 1) return `${perSecond.toFixed(0)}/s`;
  return `${perSecond.toFixed(2)}/s`;
}

export function shouldFireAnomalyAlert(
  result: AnomalyResult,
  lastFiredAt: number | null,
  now: number,
  cooldownMs: number = DEFAULT_ANOMALY_CONFIG.cooldownMs
): boolean {
  if (!result.isAnomaly) return false;
  if (lastFiredAt != null && now - lastFiredAt < cooldownMs) return false;
  return true;
}
