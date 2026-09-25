import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Car-style ignition: sweep the dial, hold, then settle on the live reading. */
export const GAUGE_SWEEP_MS = 1600;
export const GAUGE_HOLD_MS = 220;
export const GAUGE_SETTLE_MS = 900;
export const GAUGE_FOLLOW_MS = 380;
export const GAUGE_REST_MS = 280;
export const GAUGE_IGNITION_MS = GAUGE_REST_MS + GAUGE_SWEEP_MS + GAUGE_HOLD_MS + GAUGE_SETTLE_MS;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Fast out of the hole, soft into the redline. */
function sweepEase(t: number) {
  return 1 - (1 - t) ** 2.6;
}

function settleEase(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function followEase(t: number) {
  return 1 - (1 - t) ** 3;
}

/**
 * Drives a 0–1 needle/fill ratio on the JS thread so SVG can redraw each frame.
 * Ignition waits for navigation/layout, then plays once. Live target changes
 * do not cancel the sweep — they only retarget the settle / follow.
 */
export function useGaugeMotion(targetRatio: number, enabled: boolean) {
  const [ratio, setRatio] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const ignitedRef = useRef(false);
  const ratioRef = useRef(0);
  const targetRef = useRef(targetRatio);
  const reduced = useReducedMotion();

  targetRef.current = clamp01(targetRatio);

  const apply = (value: number) => {
    const v = clamp01(value);
    ratioRef.current = v;
    setRatio(v);
  };

  // Ignition: depend only on enabled / reduced so data updates cannot abort it.
  useEffect(() => {
    if (!enabled || ignitedRef.current) return;

    let cancelled = false;
    let raf = 0;
    let restTimer: ReturnType<typeof setTimeout> | undefined;
    const interaction = InteractionManager.runAfterInteractions(() => {
      if (cancelled || ignitedRef.current) return;

      if (reduced) {
        ignitedRef.current = true;
        apply(targetRef.current);
        setRevealed(true);
        return;
      }

      apply(0);
      restTimer = setTimeout(() => {
        if (cancelled || ignitedRef.current) return;
        let start: number | null = null;
        const tick = (now: number) => {
          if (cancelled) return;
          if (start == null) start = now;
          const elapsed = now - start;
          if (elapsed < GAUGE_SWEEP_MS) {
            apply(sweepEase(elapsed / GAUGE_SWEEP_MS));
            raf = requestAnimationFrame(tick);
            return;
          }
          if (elapsed < GAUGE_SWEEP_MS + GAUGE_HOLD_MS) {
            apply(1);
            raf = requestAnimationFrame(tick);
            return;
          }
          const settleT = elapsed - GAUGE_SWEEP_MS - GAUGE_HOLD_MS;
          if (settleT < GAUGE_SETTLE_MS) {
            apply(1 + (targetRef.current - 1) * settleEase(settleT / GAUGE_SETTLE_MS));
            raf = requestAnimationFrame(tick);
            return;
          }
          apply(targetRef.current);
          ignitedRef.current = true;
          setRevealed(true);
        };
        raf = requestAnimationFrame(tick);
      }, GAUGE_REST_MS);
    });

    return () => {
      cancelled = true;
      interaction.cancel();
      if (restTimer) clearTimeout(restTimer);
      cancelAnimationFrame(raf);
    };
  }, [enabled, reduced]);

  // After ignition, ease the needle when the live reading or scale changes.
  useEffect(() => {
    if (!enabled || !revealed || reduced || !ignitedRef.current) return;
    const next = clamp01(targetRatio);
    const from = ratioRef.current;
    if (Math.abs(next - from) < 0.002) return;

    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / GAUGE_FOLLOW_MS);
      apply(from + (targetRef.current - from) * followEase(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, targetRatio, revealed, reduced]);

  return { ratio, revealed, reduced: Boolean(reduced) };
}
