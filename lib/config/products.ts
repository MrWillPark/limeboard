/**
 * Store / RevenueCat product identifiers.
 * Must match App Store Connect, Play Console, and RevenueCat product IDs exactly.
 */
export const STORE_PRODUCTS = {
  monthly: 'limeboard_pro_monthly',
  annual: 'limeboard_pro_annual',
} as const;

/** RevenueCat entitlement identifier */
export const PRO_ENTITLEMENT = 'pro';

/** RevenueCat offering identifier */
export const DEFAULT_OFFERING = 'default';
