import { isWidgetSyncAvailable } from '@/lib/widgets/widget-sync-available';

let bootstrapped = false;
let lastBootstrapError: string | null = null;

export type WidgetPipelineStatus = {
  available: boolean;
  appGroup: 'unavailable' | 'ok' | 'missing';
  bootstrapped: boolean;
  lastError: string | null;
};

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

export function getWidgetPipelineStatus(): WidgetPipelineStatus {
  return {
    available: isWidgetSyncAvailable(),
    appGroup: getWidgetAppGroupStatus(),
    bootstrapped,
    lastError: lastBootstrapError,
  };
}

function getBalanceWidget() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/widgets/BalanceWidget').default;
}

function getDeskMonitorWidget() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/widgets/DeskMonitorWidget').default;
}

function logWidgetIssue(message: string, error?: unknown) {
  console.warn(`[widgets] ${message}`, error ?? '');
}

/**
 * Load widget modules so their layouts are written to the App Group.
 * Retries after a prior failure (e.g. transient App Group init).
 */
export function bootstrapWidgetLayouts(force = false): boolean {
  if (!isWidgetSyncAvailable()) return false;
  if (bootstrapped && !force && lastBootstrapError == null) {
    return getWidgetAppGroupStatus() === 'ok';
  }

  try {
    if (force) {
      bootstrapped = false;
    }

    getBalanceWidget();
    getDeskMonitorWidget();

    const appGroup = getWidgetAppGroupStatus();
    if (appGroup !== 'ok') {
      bootstrapped = false;
      lastBootstrapError =
        'App Group container unavailable — check entitlements for group.app.limeboard.mobile';
      logWidgetIssue(lastBootstrapError);
      return false;
    }

    bootstrapped = true;
    lastBootstrapError = null;
    reloadAllWidgetTimelines();
    return true;
  } catch (error) {
    bootstrapped = false;
    lastBootstrapError =
      error instanceof Error ? error.message : 'Failed to bootstrap widget layouts';
    logWidgetIssue('Failed to bootstrap widget layouts', error);
    return false;
  }
}

export function reloadAllWidgetTimelines(): void {
  if (!isWidgetSyncAvailable()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoWidgets = require('expo-widgets/build/ExpoWidgets').default;
    ExpoWidgets.reloadAllWidgets?.();
  } catch (error) {
    logWidgetIssue('reloadAllWidgets failed', error);
  }
}

export function pushBalanceWidgetSnapshot(props: object): boolean {
  if (!isWidgetSyncAvailable()) return false;
  if (!bootstrapWidgetLayouts()) return false;

  try {
    const widget = getBalanceWidget();
    widget.updateSnapshot(props);
    return true;
  } catch (error) {
    logWidgetIssue('Failed to update BalanceWidget', error);
    return false;
  }
}

export function pushDeskMonitorWidgetSnapshot(props: object): boolean {
  if (!isWidgetSyncAvailable()) return false;
  if (!bootstrapWidgetLayouts()) return false;

  try {
    const widget = getDeskMonitorWidget();
    widget.updateSnapshot(props);
    return true;
  } catch (error) {
    logWidgetIssue('Failed to update DeskMonitorWidget', error);
    return false;
  }
}
