import type { MaytesErrorCodeValue } from './errors.js';

export type MaytesEnvironment = 'sandbox' | 'production';

export interface CreateCheckoutResult {
  checkoutId: string;
  checkoutUrl?: string;
}

export type CreateCheckoutFn = () => Promise<CreateCheckoutResult>;

export interface MaytesOptions {
  createCheckout: CreateCheckoutFn;
  environment: MaytesEnvironment;
}

export interface MaytesInternalOptions {
  baseUrl?: string;
  cspNonce?: string;
}

export type RenderButtonMode = 'redirect' | 'popup';

export interface RenderButtonOptions {
  label?: string;
  block?: boolean;
  mode?: RenderButtonMode;
  radius?: number;
  height?: number;
  redirectOverlay?: boolean;
}

export type RenderButtonCleanup = () => void;

export type RedirectTarget = 'self' | 'top' | 'tab';

export type LaunchSource = 'button' | 'api';

export interface CheckoutEventDetail {
  instanceId: string;
  source: LaunchSource;
}

export type CheckoutOpenedDetail = CheckoutEventDetail;
export type CheckoutClosedDetail = CheckoutEventDetail;

export interface CheckoutRedirectedDetail extends CheckoutEventDetail {
  url: string;
  target: RedirectTarget;
}

export type CheckoutFailedReason = 'create-checkout-rejected' | 'invalid-shape' | 'navigation-blocked';

export interface CheckoutFailedDetail extends CheckoutEventDetail {
  reason: CheckoutFailedReason;
  cause?: unknown;
}

export interface CheckoutUrlOptions {
  checkoutId: string;
}

export interface RedirectOptions extends CheckoutUrlOptions {
  replace?: boolean;
}

export interface OpenCheckoutOptions {
  mode?: RenderButtonMode;
  redirectOverlay?: boolean;
}

export type OpenCheckoutResult =
  | { outcome: 'popup' }
  | { outcome: 'redirected'; target: RedirectTarget }
  | { outcome: 'failed'; reason: CheckoutFailedReason }
  | { outcome: 'closed' }
  | { outcome: 'ignored' };

export interface MaytesSDK {
  readonly instanceId: string;
  renderButton(container: HTMLElement, options?: RenderButtonOptions): RenderButtonCleanup;
  openCheckout(options?: OpenCheckoutOptions): Promise<OpenCheckoutResult>;
  onBusyChange(listener: (busy: boolean) => void): () => void;
  redirectToCheckout(options: RedirectOptions): void;
  checkoutUrl(options: CheckoutUrlOptions): string;
  destroy(): void;
}

export type MaytesFactory = (
  options: MaytesOptions,
  internal?: MaytesInternalOptions,
) => MaytesSDK;

export type { MaytesErrorCodeValue };

declare global {
  interface DocumentEventMap {
    'maytes:checkout-opened': CustomEvent<CheckoutOpenedDetail>;
    'maytes:checkout-closed': CustomEvent<CheckoutClosedDetail>;
    'maytes:checkout-redirected': CustomEvent<CheckoutRedirectedDetail>;
    'maytes:checkout-failed': CustomEvent<CheckoutFailedDetail>;
  }

  interface Window {
    Maytes: MaytesFactory;
  }
}
