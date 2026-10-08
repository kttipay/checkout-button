import { describe, it, expect } from 'vitest';
import {
  MAYTES_CHECKOUT_BUTTON_TAG,
  MaytesCheckoutButtonElement,
  defineMaytesCheckoutButton,
} from '../element.js';

describe('defining <maytes-checkout-button>', () => {
  it('defines the tag on import', () => {
    expect(customElements.get(MAYTES_CHECKOUT_BUTTON_TAG)).toBe(MaytesCheckoutButtonElement);
  });

  it('can be defined again without throwing, for apps that import it twice', () => {
    expect(defineMaytesCheckoutButton()).toBe(true);
    expect(defineMaytesCheckoutButton()).toBe(true);
    expect(document.createElement(MAYTES_CHECKOUT_BUTTON_TAG)).toBeInstanceOf(MaytesCheckoutButtonElement);
  });
});
