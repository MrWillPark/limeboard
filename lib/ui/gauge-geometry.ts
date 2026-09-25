/** Shared 270° speedometer geometry. 0° is right; angles increase clockwise in SVG. */

export const GAUGE_START_ANGLE = 135;
export const GAUGE_SWEEP = 270;

export function gaugePolar(cx: number, cy: number, angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

export function gaugeArcPath(
  cx: number,
  cy: number,
  fromAngle: number,
  toAngle: number,
  radius: number
) {
  const start = gaugePolar(cx, cy, fromAngle, radius);
  const end = gaugePolar(cx, cy, toAngle, radius);
  const large = toAngle - fromAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function gaugeTrackPath(cx: number, cy: number, radius: number) {
  return gaugeArcPath(cx, cy, GAUGE_START_ANGLE, GAUGE_START_ANGLE + GAUGE_SWEEP, radius);
}

export function gaugeValueToRatio(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

export function gaugeValueToAngle(value: number, max: number) {
  return GAUGE_START_ANGLE + gaugeValueToRatio(value, max) * GAUGE_SWEEP;
}

export function gaugeArcLength(radius: number) {
  return (GAUGE_SWEEP / 360) * 2 * Math.PI * radius;
}
