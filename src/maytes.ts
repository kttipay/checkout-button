import { renderButton } from './button.js';
import { assertLaunchMode, assertRedirectOverlay, closePopupWindow, launchCheckout, stopPopupPoll } from './launch.js';
import { isValidEnvironment } from './env.js';
import { MaytesError, MaytesErrorCode } from './errors.js';
import { hideOverlay } from './overlay.js';
import { makeRedirect, normalizeBaseUrl } from './redirect.js';
import { createInstanceState } from './state.js';
import type {
  MaytesFactory,
  MaytesInternalOptions,
  MaytesOptions,
  MaytesSDK,
} from './types.js';

function validateOptions(options: MaytesOptions): void {
  if (typeof options !== 'object' || options === null) {
    throw new MaytesError(MaytesErrorCode.Config, 'Maytes() requires an options object');
  }
  if (typeof options.createCheckout !== 'function') {
    throw new MaytesError(
      MaytesErrorCode.Config,
      'Maytes({ createCheckout }) must be an async function returning { checkoutId }',
    );
  }
  if (!isValidEnvironment(options.environment)) {
    throw new MaytesError(
      MaytesErrorCode.Config,
      "Maytes({ environment }) must be 'sandbox' or 'production'",
    );
  }
}

function validateInternalOptions(internal: MaytesInternalOptions | undefined): void {
  if (internal === undefined) return;
  if (internal.baseUrl !== undefined) normalizeBaseUrl(internal.baseUrl);
}

export const Maytes: MaytesFactory = (options, internal) => {
  validateOptions(options);
  validateInternalOptions(internal);

  const state = createInstanceState(options, internal);
  const { checkoutUrl, redirectToCheckout } = makeRedirect(
    state.config.environment,
    state.config.baseUrl,
  );

  const sdk: MaytesSDK = {
    instanceId: state.instanceId,
    renderButton(container, opts) {
      return renderButton(state, container, opts);
    },
    openCheckout(opts) {
      if (state.destroyed) {
        throw new MaytesError(MaytesErrorCode.Config, 'openCheckout() called on a destroyed Maytes instance');
      }
      const mode = assertLaunchMode(opts?.mode ?? 'popup', 'openCheckout');
      const redirectOverlay = assertRedirectOverlay(opts?.redirectOverlay, 'openCheckout');
      return launchCheckout(state, mode, 'api', redirectOverlay);
    },
    onBusyChange(listener) {
      if (state.destroyed) {
        throw new MaytesError(MaytesErrorCode.Config, 'onBusyChange() called on a destroyed Maytes instance');
      }
      state.busyViews.add(listener);
      return () => {
        state.busyViews.delete(listener);
      };
    },
    redirectToCheckout(opts) {
      redirectToCheckout(opts);
    },
    checkoutUrl(opts) {
      return checkoutUrl(opts);
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      stopPopupPoll(state);
      state.restoreDetach?.();
      hideOverlay(state);
      if (!state.popupNavigated) closePopupWindow(state.popupWindow);
      state.popupWindow = null;
      state.busy = false;
      for (const teardown of [...state.teardowns]) teardown();
      state.teardowns.clear();
    },
  };

  return sdk;
};
