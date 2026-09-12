/**
 * Live Activity bridge (spike).
 *
 * Full ActivityKit / Dynamic Island needs a native extension + EAS rebuild.
 * Until that ships, velocity anomalies surface in-cockpit via
 * `useVelocityAnomaly`. This module is the stable API surface for the native
 * layer to call once ActivityKit is wired.
 */

export type LiveBurnActivityPayload = {
  balanceLabel: string;
  burnPerSecondLabel: string;
  runwayLabel: string;
  updatedAt: number;
};

let lastPayload: LiveBurnActivityPayload | null = null;

export function getLastLiveBurnPayload(): LiveBurnActivityPayload | null {
  return lastPayload;
}

/** Push a payload that a future Live Activity extension can consume. */
export function syncLiveBurnActivity(payload: LiveBurnActivityPayload): void {
  lastPayload = payload;
  // Native ActivityKit start/update will hook here after the extension lands.
}
