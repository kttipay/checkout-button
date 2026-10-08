import { Maytes, MaytesError, MaytesErrorCode } from '@maytes/checkout-button';
import type {
  CreateCheckoutFn,
  MaytesEnvironment,
  MaytesSDK,
  RenderButtonCleanup,
  RenderButtonMode,
  RenderButtonOptions,
} from '@maytes/checkout-button';

export const MAYTES_CHECKOUT_BUTTON_TAG = 'maytes-checkout-button';

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

  private mount(): void {
    if (!this.isConnected || this.checkoutCallback === null || this.maytes !== null) return;
    const nonce = this.getAttribute('nonce');
    const maytes = Maytes(
      {
        createCheckout: () => this.startCheckout(),
        environment: this.getAttribute('environment') as MaytesEnvironment,
      },
      nonce === null ? undefined : { cspNonce: nonce },
    );
    this.maytes = maytes;
    this.renderButton(maytes);
  }

  private renderButton(maytes: MaytesSDK): void {
    const removeButton = maytes.renderButton(this, readButtonOptions(this));
    this.removeButton?.();
    this.removeButton = removeButton;
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
