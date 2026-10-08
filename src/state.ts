import type { MaytesOptions, MaytesInternalOptions } from './types.js';

export interface InstanceState {
  config: MaytesOptions & MaytesInternalOptions;
  busy: boolean;
  busyViews: Set<(busy: boolean) => void>;
  instanceId: string;
  overlayEl: HTMLDialogElement | null;
  overlayDetach: (() => void) | null;
  restoreDetach: (() => void) | null;
  popupWindow: Window | null;
  popupNavigated: boolean;
  popupName: string;
  popupPollHandle: ReturnType<typeof setInterval> | null;
  destroyed: boolean;
  teardowns: Set<() => void>;
}

function randomSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      return randomSuffix();
    }
  }
  return randomSuffix();
}

export function createInstanceState(
  options: MaytesOptions,
  internal: MaytesInternalOptions | undefined,
): InstanceState {
  const config: MaytesOptions & MaytesInternalOptions = {
    createCheckout: options.createCheckout,
    environment: options.environment,
  };
  if (internal?.baseUrl !== undefined) config.baseUrl = internal.baseUrl;
  if (internal?.cspNonce !== undefined) config.cspNonce = internal.cspNonce;
  return {
    config,
    busy: false,
    busyViews: new Set(),
    instanceId: randomId(),
    overlayEl: null,
    overlayDetach: null,
    restoreDetach: null,
    popupWindow: null,
    popupNavigated: false,
    popupName: `maytes-checkout-${randomId()}`,
    popupPollHandle: null,
    destroyed: false,
    teardowns: new Set(),
  };
}
