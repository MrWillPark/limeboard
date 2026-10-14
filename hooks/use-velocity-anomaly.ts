import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_ANOMALY_CONFIG,
  evaluateVelocityAnomaly,
  shouldFireAnomalyAlert,
  type AnomalyResult,
  type AnomalySample,
} from '@/lib/alerts/velocity-anomaly';
import { maybeNotifyLocalBurnSpike } from '@/lib/notifications/local-spike';

const MAX_SAMPLES = 24;

/**
 * Tracks burn-rate samples and surfaces velocity anomalies for in-app alerts
 * and local OS notifications (when backgrounded).
 */
export function useVelocityAnomaly(perSecond: number, enabled: boolean) {
  const historyRef = useRef<AnomalySample[]>([]);
  const lastFiredAtRef = useRef<number | null>(null);
  const [activeAlert, setActiveAlert] = useState<AnomalyResult | null>(null);

  useEffect(() => {
    if (!enabled || !Number.isFinite(perSecond) || perSecond < 0) return;

    const now = Date.now();
    const next = [...historyRef.current, { at: now, perSecond }];
    historyRef.current = next.slice(-MAX_SAMPLES);

    const result = evaluateVelocityAnomaly(historyRef.current, DEFAULT_ANOMALY_CONFIG);
    if (shouldFireAnomalyAlert(result, lastFiredAtRef.current, now)) {
      lastFiredAtRef.current = now;
      setActiveAlert(result);
      if (result.reason) {
        void maybeNotifyLocalBurnSpike(result.reason);
      }
    }
  }, [perSecond, enabled]);

  const dismissAlert = () => setActiveAlert(null);

  return { activeAlert, dismissAlert };
}
