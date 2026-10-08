import { buildMaytesLogo } from './branding.js';
import { foundation } from './foundation/brand.generated.js';
import { MaytesError, MaytesErrorCode } from './errors.js';
import { isSecurityError, navigateTopLevel, viewportWidth } from './framing.js';
import { hideOverlay, showOverlay } from './overlay.js';
import { buildCheckoutUrl, isHttpUrl } from './redirect.js';
import { POPUP_LOADING_CSS } from './styles.js';
import type { InstanceState } from './state.js';
import type {
  CheckoutFailedReason,
  CheckoutRedirectedDetail,
  OpenCheckoutResult,
  RedirectTarget,
  RenderButtonMode,
} from './types.js';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 800;
const POPUP_POLL_INTERVAL_MS = 500;
const MOBILE_MAX_WIDTH = 600;
const SLOW_NETWORK_DELAY_MS = 8000;

function isValidCheckoutResult(value: unknown): value is { checkoutId: string; checkoutUrl?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as { checkoutId?: unknown; checkoutUrl?: unknown };
  if (typeof obj.checkoutId !== 'string' || obj.checkoutId.trim().length === 0) return false;
  if (obj.checkoutUrl !== undefined) {
    if (typeof obj.checkoutUrl !== 'string' || obj.checkoutUrl.trim().length === 0) return false;
    if (!isHttpUrl(obj.checkoutUrl)) return false;
  }
  return true;
}

function refocusPopup(popup: Window): void {
  try { popup.focus(); } catch (err) {
    if (!isSecurityError(err)) throw err;
  }
}

export function closePopupWindow(popup: Window | null): void {
  if (popup === null) return;
  try {
    if (!popup.closed) popup.close();
  } catch (err) {
    if (!isSecurityError(err)) throw err;
  }
}

function popupFeatures(): string {
  const screenWidth = window.screen?.width ?? POPUP_WIDTH;
  const screenHeight = window.screen?.height ?? POPUP_HEIGHT;
  const left = Math.max(0, Math.round((screenWidth - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round((screenHeight - POPUP_HEIGHT) / 2));
  return `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=yes`;
}

export function stopPopupPoll(state: InstanceState): void {
  if (state.popupPollHandle !== null) {
    clearInterval(state.popupPollHandle);
    state.popupPollHandle = null;
  }
}

function startPopupPoll(state: InstanceState, onClose: () => void): void {
  stopPopupPoll(state);
  state.popupPollHandle = setInterval(() => {
    const popup = state.popupWindow;
    if (popup === null || popup.closed) {
      stopPopupPoll(state);
      state.popupWindow = null;
      onClose();
    }
  }, POPUP_POLL_INTERVAL_MS);
}

function isMobileViewport(): boolean {
  return viewportWidth() <= MOBILE_MAX_WIDTH;
}

function openBlankPopup(state: InstanceState): Window | null {
  return window.open('about:blank', state.popupName, popupFeatures());
}

function navigatePopup(popup: Window, url: string): void {
  popup.location.replace(url);
}

function removePopupChildren(doc: Document): void {
  while (doc.body.firstChild !== null) doc.body.removeChild(doc.body.firstChild);
}

function paintPopupLoadingScreen(popup: Window, cspNonce: string | undefined): void {
  const doc = popup.document as Document | null;
  if (doc === null || doc.head === null || doc.body === null) return;
  doc.title = 'Maytes checkout';
  doc.documentElement.lang = 'en';
  const style = doc.createElement('style');
  if (cspNonce !== undefined && cspNonce !== '') style.setAttribute('nonce', cspNonce);
  style.textContent = POPUP_LOADING_CSS;
  doc.head.appendChild(style);

  doc.body.classList.add('maytes-popup-loading');
  removePopupChildren(doc);

  const content = doc.createElement('main');
  content.className = 'maytes-popup-loading__content';
  content.setAttribute('role', 'status');
  content.setAttribute('aria-live', 'polite');

  const logo = buildMaytesLogo('2.75rem', foundation.text.primaryInverse);
  logo.setAttribute('class', 'maytes-popup-loading__logo');
  logo.setAttribute('aria-hidden', 'true');
  content.appendChild(logo);

  const spinner = doc.createElement('div');
  spinner.className = 'maytes-popup-loading__spinner';
  spinner.setAttribute('aria-hidden', 'true');
  content.appendChild(spinner);

  const text = doc.createElement('p');
  text.className = 'maytes-popup-loading__text';
  text.textContent = 'Completing checkout with Maytes…';
  content.appendChild(text);

  const slow = doc.createElement('p');
  slow.className = 'maytes-popup-loading__slow';
  slow.hidden = true;
  slow.textContent = 'Still connecting. This can take a moment on slow networks.';
  content.appendChild(slow);

  doc.body.appendChild(content);
  setTimeout(() => { slow.hidden = false; }, SLOW_NETWORK_DELAY_MS);
}

function dispatchFailed(reason: CheckoutFailedReason, cause?: unknown): void {
  document.dispatchEvent(new CustomEvent('maytes:checkout-failed', {
    detail: cause === undefined ? { reason } : { reason, cause },
  }));
}

function dispatchRedirected(url: string, target: RedirectTarget): void {
  const detail: CheckoutRedirectedDetail = { url, target };
  document.dispatchEvent(new CustomEvent('maytes:checkout-redirected', { detail }));
}

export function assertLaunchMode(mode: unknown, caller = 'renderButton'): RenderButtonMode {
  if (mode !== 'redirect' && mode !== 'popup') {
    throw new MaytesError(MaytesErrorCode.Config, `${caller}({ mode }) must be 'redirect' or 'popup'`);
  }
  return mode;
}

export function setInstanceBusy(state: InstanceState, busy: boolean): void {
  state.busy = busy;
  for (const view of [...state.busyViews]) view(busy);
}

function endLaunch(state: InstanceState): void {
  hideOverlay(state);
  setInstanceBusy(state, false);
}

function closeOrphanPopup(state: InstanceState, popup: Window | null): void {
  closePopupWindow(popup);
  stopPopupPoll(state);
  if (state.popupWindow === popup) state.popupWindow = null;
  endLaunch(state);
}

function navigateAway(state: InstanceState, url: string): OpenCheckoutResult {
  const navigation = navigateTopLevel(url, false);
  endLaunch(state);
  if (navigation.target === null) {
    console.error('[maytes/checkout-button] could not leave the embedding frame:', navigation.cause);
    dispatchFailed('navigation-blocked', navigation.cause);
    return { outcome: 'failed', reason: 'navigation-blocked' };
  }
  dispatchRedirected(url, navigation.target);
  return { outcome: 'redirected', target: navigation.target };
}

function openPopupLoader(state: InstanceState): Window | null {
  const popup = openBlankPopup(state);
  if (popup === null) return null;
  state.popupWindow = popup;
  state.popupNavigated = false;
  refocusPopup(popup);
  paintPopupLoadingScreen(popup, state.config.cspNonce);
  showOverlay(state);
  document.dispatchEvent(new CustomEvent('maytes:checkout-opened'));
  startPopupPoll(state, () => {
    endLaunch(state);
    document.dispatchEvent(new CustomEvent('maytes:checkout-closed'));
  });
  return popup;
}

export async function launchCheckout(state: InstanceState, mode: RenderButtonMode): Promise<OpenCheckoutResult> {
  if (state.busy || state.destroyed) return { outcome: 'ignored' };
  setInstanceBusy(state, true);
  const shouldUsePopup = mode === 'popup' && !isMobileViewport();
  const popup = shouldUsePopup ? openPopupLoader(state) : null;
  try {
    const result = await state.config.createCheckout();
    if (state.destroyed || (popup !== null && popup.closed)) {
      closePopupWindow(popup);
      return { outcome: 'closed' };
    }
    if (!isValidCheckoutResult(result)) {
      closeOrphanPopup(state, popup);
      const shapeError = new MaytesError(
        MaytesErrorCode.Config,
        'createCheckout must resolve to { checkoutId: string, checkoutUrl?: http(s) URL }',
      );
      console.error(shapeError);
      dispatchFailed('invalid-shape', shapeError);
      return { outcome: 'failed', reason: 'invalid-shape' };
    }
    const url = result.checkoutUrl ?? buildCheckoutUrl(
      state.config.environment,
      state.config.baseUrl,
      result.checkoutId,
    );
    if (popup !== null) {
      state.popupNavigated = true;
      navigatePopup(popup, url);
      return { outcome: 'popup' };
    }
    if (shouldUsePopup) {
      console.warn('[maytes/checkout-button] popup was blocked; redirecting instead');
    }
    return navigateAway(state, url);
  } catch (err) {
    if (popup !== null && popup.closed) return { outcome: 'closed' };
    closeOrphanPopup(state, popup);
    console.error('[maytes/checkout-button] createCheckout failed:', err);
    dispatchFailed('create-checkout-rejected', err);
    return { outcome: 'failed', reason: 'create-checkout-rejected' };
  }
}
