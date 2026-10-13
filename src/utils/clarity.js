/**
 * Microsoft Clarity analytics integration module.
 * Provides initialization, session upgrading, consent management (v1 & v2),
 * user identification, and custom event tracking.
 */

const DEFAULT_PROJECT_ID = 'yx0etql312';

/**
 * Initializes Microsoft Clarity script in the document head if not already loaded.
 * @param {string} [projectId] - The Clarity project ID. Defaults to env or default ID.
 */
export function initClarity(projectId = import.meta.env.VITE_CLARITY_PROJECT_ID || DEFAULT_PROJECT_ID) {
  if (typeof window === 'undefined') return;
  if (!projectId) {
    console.warn('[Clarity] Project ID is missing. Clarity tracking not initialized.');
    return;
  }

  if (window.clarity) {
    return;
  }

  // Microsoft Clarity tracking snippet
  (function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);
}

/**
 * Wrapper to safely invoke window.clarity methods.
 */
function callClarity(...args) {
  if (typeof window !== 'undefined') {
    if (window.clarity) {
      window.clarity(...args);
    } else {
      // Initialize if not already done, then call
      initClarity();
      if (window.clarity) {
        window.clarity(...args);
      }
    }
  }
}

/**
 * Prioritizes/upgrades session for recording in Clarity.
 * Useful for high-value interactions (e.g. checkout, test start, submission, login).
 *
 * @param {string} reason - Reason for upgrading session (e.g., 'test_start', 'admission_submit')
 */
export function upgradeClaritySession(reason) {
  if (!reason) return;
  callClarity("upgrade", reason);
}

/**
 * Manage cookie and analytics consent.
 *
 * Supports both v1 (boolean) and v2 (consentOptions object):
 *
 * v2:
 *   setClarityConsent({ ad_Storage: "granted" | "denied", analytics_Storage: "granted" | "denied" })
 *
 * v1:
 *   setClarityConsent(true | false)
 *
 * @param {boolean | { ad_Storage?: 'granted' | 'denied', analytics_Storage?: 'granted' | 'denied' }} consentArg
 */
export function setClarityConsent(consentArg) {
  if (typeof consentArg === 'boolean') {
    // v1 API: Clarity.consent(boolean)
    callClarity("consent", consentArg);
  } else if (consentArg && typeof consentArg === 'object') {
    // v2 API: Clarity.consent(consentOptions)
    callClarity("consent", consentArg);
  }
}

/**
 * Identifies a logged-in user in Clarity.
 *
 * @param {string} customId - Unique user identifier (e.g., student UID or email)
 * @param {string} [customSessionId] - Optional session ID
 * @param {string} [customPageId] - Optional page ID
 * @param {string} [friendlyName] - Optional display name
 */
export function identifyClarityUser(customId, customSessionId, customPageId, friendlyName) {
  if (!customId) return;
  callClarity("identify", customId, customSessionId, customPageId, friendlyName);
}

/**
 * Set custom tags in Clarity for session filtering.
 *
 * @param {string} key
 * @param {string} value
 */
export function setClarityTag(key, value) {
  if (!key) return;
  callClarity("set", key, value);
}

/**
 * Track custom events in Clarity.
 *
 * @param {string} eventName
 */
export function trackClarityEvent(eventName) {
  if (!eventName) return;
  callClarity("event", eventName);
}

export default {
  init: initClarity,
  upgrade: upgradeClaritySession,
  consent: setClarityConsent,
  identify: identifyClarityUser,
  setTag: setClarityTag,
  event: trackClarityEvent,
};
