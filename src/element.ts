export const MAYTES_CHECKOUT_BUTTON_TAG = 'maytes-checkout-button';

const BaseElement = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export class MaytesCheckoutButtonElement extends BaseElement {}

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
