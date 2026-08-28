import { isWidgetSyncAvailable } from '@/lib/widgets/widget-sync-available';

let bootstrapped = false;

/** Whether the App Group container is reachable from the main app. */
export function getWidgetAppGroupStatus(): 'unavailable' | 'ok' | 'missing' {
  if (!isWidgetSyncAvailable()) return 'unavailable';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoWidgets = require('expo-widgets/build/ExpoWidgets').default;
    return ExpoWidgets.widgetsDirectory ? 'ok' : 'missing';
  } catch {
    return 'missing';
  }
}

function getBalanceWidget() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/widgets/BalanceWidget').default;
}

function getDeskMonitorWidget() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/widgets/DeskMonitorWidget').default;
}

/**
 * Load widget modules so their layouts are written to the App Group.
 * Without this, home-screen widgets stay blank until Cockpit is opened.
 */
export function bootstrapWidgetLayouts(): boolean {
  if (!isWidgetSyncAvailable()) return false;
  if (bootstrapped) return true;

  try {
    getBalanceWidget();
    getDeskMonitorWidget();
    bootstrapped = true;

    if (getWidgetAppGroupStatus() === 'missing') {
      console.warn(
        '[widgets] App Group container unavailable — check entitlements for group.app.limeboard.mobile'
      );
    }
    return true;
  } catch (error) {
    console.warn('[widgets] Failed to bootstrap widget layouts', error);
    return false;
  }
}

export function reloadAllWidgetTimelines(): void {
  if (!isWidgetSyncAvailable() || !bootstrapped) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoWidgets = require('expo-widgets/build/ExpoWidgets').default;
    ExpoWidgets.reloadAllWidgets?.();
  } catch (error) {
    console.warn('[widgets] reloadAllWidgets failed', error);
  }
}

export function pushBalanceWidgetSnapshot(props: object): void {
  if (!isWidgetSyncAvailable()) return;
  if (!bootstrapWidgetLayouts()) return;

  try {
    const widget = getBalanceWidget();
    widget.updateSnapshot(props);
    widget.reload();
  } catch (error) {
    console.warn('[widgets] Failed to update BalanceWidget', error);
  }
}

export function pushDeskMonitorWidgetSnapshot(props: object): void {
  if (!isWidgetSyncAvailable()) return;
  if (!bootstrapWidgetLayouts()) return;

  try {
    const widget = getDeskMonitorWidget();
    widget.updateSnapshot(props);
    widget.reload();
  } catch (error) {
    console.warn('[widgets] Failed to update DeskMonitorWidget', error);
  }
}
