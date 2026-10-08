import type { CheckoutFailedDetail, CheckoutRedirectedDetail, LaunchSource } from '@maytes/checkout-button';

export interface MaytesEventHandlers {
  onOpened?: () => void;
  onClosed?: () => void;
  onRedirected?: (detail: CheckoutRedirectedDetail) => void;
  onFailed?: (detail: CheckoutFailedDetail) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function listenToInstanceEvents(
  target: Document,
  instanceId: string,
  source: LaunchSource,
  handlers: () => MaytesEventHandlers,
): () => void {
  const belongs = (event: Event): Record<string, unknown> | null => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (!isRecord(detail) || detail.instanceId !== instanceId || detail.source !== source) return null;
    return detail;
  };

  const listeners: Array<[string, (event: Event) => void]> = [
    ['maytes:checkout-opened', (event) => { if (belongs(event)) handlers().onOpened?.(); }],
    ['maytes:checkout-closed', (event) => { if (belongs(event)) handlers().onClosed?.(); }],
    ['maytes:checkout-redirected', (event) => {
      const detail = belongs(event);
      if (detail) handlers().onRedirected?.(detail as unknown as CheckoutRedirectedDetail);
    }],
    ['maytes:checkout-failed', (event) => {
      const detail = belongs(event);
      if (detail) handlers().onFailed?.(detail as unknown as CheckoutFailedDetail);
    }],
  ];

  for (const [name, listener] of listeners) target.addEventListener(name, listener);
  return () => {
    for (const [name, listener] of listeners) target.removeEventListener(name, listener);
  };
}
