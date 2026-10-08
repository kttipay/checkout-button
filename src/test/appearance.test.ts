import { describe, it, expect, beforeEach } from 'vitest';
import { ensureStylesInjected, resetStylesForTests } from '../styles.js';

function injectedCss(): string {
  ensureStylesInjected(undefined);
  return document.head.querySelector('style[data-maytes-checkout-button]')?.textContent ?? '';
}

describe('button CSS hooks', () => {
  beforeEach(() => {
    resetStylesForTests();
  });

  it('the default radius is still a pill, read through --maytes-button-radius', () => {
    const css = injectedCss();
    expect(css).toContain('border-radius: var(--maytes-button-radius, 999px);');
    expect(css).not.toMatch(/border-radius:\s*999px;/);
  });

  it('the height comes from --maytes-button-height and defaults to the natural height', () => {
    expect(injectedCss()).toContain('min-height: var(--maytes-button-height, auto);');
  });

  it('the label never wraps and the height is the outer height', () => {
    const css = injectedCss();
    expect(css).toContain('white-space: nowrap;');
    expect(css).toContain('box-sizing: border-box;');
  });
});
