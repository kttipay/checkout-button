// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('<maytes-checkout-button> on the server', () => {
  it('imports without window, HTMLElement or customElements and defines nothing', async () => {
    expect(typeof HTMLElement).toBe('undefined');
    expect(typeof customElements).toBe('undefined');
    const element = await import('../element.js');
    expect(element.defineMaytesCheckoutButton()).toBe(false);
  });
});
