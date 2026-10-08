import { Maytes, MaytesError, MaytesErrorCode } from '@maytes/checkout-button';
import type {
  CheckoutFailedDetail,
  CreateCheckoutFn,
  MaytesEnvironment,
  MaytesSDK,
  RenderButtonCleanup,
  RenderButtonMode,
  RenderButtonOptions,
} from '@maytes/checkout-button';

export const MAYTES_CHECKOUT_BUTTON_TAG = 'maytes-checkout-button';

export interface ElementConfigFailedDetail {
  reason: 'config';
  cause: unknown;
}

export type MaytesElementFailedDetail = CheckoutFailedDetail | ElementConfigFailedDetail;

const OBSERVED_ATTRIBUTES = ['environment', 'nonce', 'mode', 'label', 'block', 'radius', 'height'];
const INSTANCE_ATTRIBUTES = new Set(['environment', 'nonce']);

const BaseElement = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

function numberAttribute(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  return Number(value);
}

export function readButtonOptions(element: Element): RenderButtonOptions {
  const options: RenderButtonOptions = { block: element.hasAttribute('block') };
  const mode = element.getAttribute('mode');
  if (mode !== null) options.mode = mode as RenderButtonMode;
  const label = element.getAttribute('label');
  if (label !== null) options.label = label;
  const radius = numberAttribute(element.getAttribute('radius'));
  if (radius !== undefined) options.radius = radius;
  const height = numberAttribute(element.getAttribute('height'));
  if (height !== undefined) options.height = height;
  return options;
}

export class MaytesCheckoutButtonElement extends BaseElement {
  private checkoutCallback: CreateCheckoutFn | null = null;
  private maytes: MaytesSDK | null = null;
  private removeButton: RenderButtonCleanup | null = null;

  static get observedAttributes(): string[] {
    return OBSERVED_ATTRIBUTES;
  }

  get createCheckout(): CreateCheckoutFn | null {
    return this.checkoutCallback;
  }

  set createCheckout(callback: CreateCheckoutFn | null) {
    this.checkoutCallback = typeof callback === 'function' ? callback : null;
    this.mount();
  }

  get instanceId(): string | null {
    return this.maytes?.instanceId ?? null;
  }

  connectedCallback(): void {
    this.mount();
  }

  disconnectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected) this.unmount();
    });
  }

  attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    if (previous === next) return;
    if (this.maytes === null) {
      this.mount();
      return;
    }
    if (INSTANCE_ATTRIBUTES.has(name)) {
      this.recreateWhenIdle();
      return;
    }
    this.renderButton(this.maytes);
  }

  private mount(): void {
    if (!this.isConnected || this.checkoutCallback === null || this.maytes !== null) return;
    const nonce = this.getAttribute('nonce');
    let maytes: MaytesSDK;
    try {
      maytes = Maytes(
        {
          createCheckout: () => this.startCheckout(),
          environment: this.getAttribute('environment') as MaytesEnvironment,
        },
        nonce === null ? undefined : { cspNonce: nonce },
      );
    } catch (error) {
      this.reportConfigError(error);
      return;
    }
    this.maytes = maytes;
    this.renderButton(maytes);
  }

  private renderButton(maytes: MaytesSDK): void {
    let removeButton: RenderButtonCleanup;
    try {
      removeButton = maytes.renderButton(this, readButtonOptions(this));
    } catch (error) {
      this.reportConfigError(error);
      return;
    }
    this.removeButton?.();
    this.removeButton = removeButton;
  }

  private recreateWhenIdle(): void {
    this.unmount();
    this.mount();
  }

  private reportConfigError(error: unknown): void {
    if (!(error instanceof MaytesError)) throw error;
    console.error('[maytes/checkout-button] <maytes-checkout-button> configuration error:', error);
    const detail: ElementConfigFailedDetail = { reason: 'config', cause: error };
    this.dispatchEvent(new CustomEvent('maytes-failed', { detail, bubbles: true, composed: true }));
  }

  private startCheckout(): ReturnType<CreateCheckoutFn> {
    const callback = this.checkoutCallback;
    if (callback === null) {
      return Promise.reject(new MaytesError(MaytesErrorCode.Config, '<maytes-checkout-button> has no createCheckout'));
    }
    return callback();
  }

  private unmount(): void {
    this.removeButton?.();
    this.removeButton = null;
    this.maytes?.destroy();
    this.maytes = null;
  }
}

export function defineMaytesCheckoutButton(): boolean {
  if (typeof customElements === 'undefined') return false;
  if (customElements.get(MAYTES_CHECKOUT_BUTTON_TAG) === undefined) {
    customElements.define(MAYTES_CHECKOUT_BUTTON_TAG, MaytesCheckoutButtonElement);
  }
  return true;
}

defineMaytesCheckoutButton();

declare global {
  interface HTMLElementTagNameMap {
    'maytes-checkout-button': MaytesCheckoutButtonElement;
  }
}
