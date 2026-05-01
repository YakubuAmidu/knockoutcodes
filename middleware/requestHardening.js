// middleware/requestHardening.js

/**
 * Compatibility wrapper around securityShield.js
 *
 * Why this file still exists:
 * - keeps old imports working
 * - avoids breaking routes right now
 * - gives us one real source of truth in securityShield.js
 */

import {
  requireJson as requireJsonContent,
  maxBodySize,
  headerSanity,
  publicShield,
  writeShield,
} from "./securityShield.js";

/**
 * Keep the old exported name so existing route imports do not break.
 */
export { requireJsonContent, headerSanity };

/**
 * Keep the old function name so existing code continues to work.
 */
export function maxBodyBytes(maxBytes = 50 * 1024) {
  return maxBodySize(maxBytes);
}

/**
 * Old public pack -> now uses securityShield source of truth
 */
export const publicRequestHardening = [...publicShield];

/**
 * Old admin write pack -> now uses securityShield source of truth
 */
export const adminRequestHardening = [...writeShield];

/**
 * Delete routes usually only need light header sanity.
 * Keep this separate because some DELETE routes may not send JSON bodies.
 */
export const adminDeleteHardening = [headerSanity];