import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Maytes, MaytesError, MaytesErrorCode } from '../index.js';
import { assertAppearance } from '../appearance.js';
import { ensureStylesInjected, resetStylesForTests } from '../styles.js';
import { resetMaytesDomForTests } from './reset-dom.js';

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

function expectConfigError(run: () => unknown, message?: RegExp): void {
  try {
    run();
    expect.fail('expected a CONFIG error');
  } catch (error) {
    expect(error).toBeInstanceOf(MaytesError);
    expect((error as MaytesError).code).toBe(MaytesErrorCode.Config);
    if (message) expect((error as MaytesError).message).toMatch(message);
  }
}

describe('renderButton radius and height', () => {
  let container: HTMLElement;
  const maytes = () => Maytes({ createCheckout: async () => ({ checkoutId: 'x' }), environment: 'sandbox' });

  beforeEach(() => {
    resetMaytesDomForTests();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('a button without appearance options has no inline style', () => {
    maytes().renderButton(container);
    expect(container.querySelector('button')!.getAttribute('style')).toBeNull();
  });

  it('sets the radius and height as custom properties on the button', () => {
    maytes().renderButton(container, { radius: 6, height: 48 });
    const button = container.querySelector('button')!;
    expect(button.style.getPropertyValue('--maytes-button-radius')).toBe('6px');
    expect(button.style.getPropertyValue('--maytes-button-height')).toBe('48px');
  });

  it('sets only the option that was given', () => {
    maytes().renderButton(container, { radius: 0 });
    const button = container.querySelector('button')!;
    expect(button.style.getPropertyValue('--maytes-button-radius')).toBe('0px');
    expect(button.style.getPropertyValue('--maytes-button-height')).toBe('');
  });

  it('accepts the boundaries', () => {
    expect(assertAppearance({ height: 40 })).toEqual({ height: 40 });
    expect(assertAppearance({ height: 55 })).toEqual({ height: 55 });
    expect(assertAppearance({ radius: 24, height: 48 })).toEqual({ radius: 24, height: 48 });
    expect(assertAppearance({ radius: 999 })).toEqual({ radius: 999 });
    expect(assertAppearance({})).toEqual({});
  });

  it('rejects a height outside 40 to 55', () => {
    expectConfigError(() => maytes().renderButton(container, { height: 39 }), /40 to 55/);
    expectConfigError(() => maytes().renderButton(container, { height: 56 }), /40 to 55/);
  });

  it('rejects a radius above half the height', () => {
    expectConfigError(() => maytes().renderButton(container, { radius: 30, height: 48 }), /0 to 24/);
    expectConfigError(() => maytes().renderButton(container, { radius: 24, height: 47 }), /0 to 23/);
  });

  it('rejects a radius above 999 without a height', () => {
    expectConfigError(() => maytes().renderButton(container, { radius: 1000 }), /0 to 999/);
  });

  it('rejects non-whole, negative and non-numeric values', () => {
    for (const height of [47.5, Number.NaN, Number.POSITIVE_INFINITY, '48' as unknown as number]) {
      expectConfigError(() => assertAppearance({ height }));
    }
    for (const radius of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '6' as unknown as number]) {
      expectConfigError(() => assertAppearance({ radius }));
    }
  });

  it('an invalid option throws before any style tag is injected', () => {
    expectConfigError(() => maytes().renderButton(container, { height: 10 }));
    expect(document.head.querySelector('style[data-maytes-checkout-button]')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });
});

describe('default rendering stays as in 1.1', () => {
  function injectedCss(): string {
    const host = document.createElement('div');
    document.body.appendChild(host);
    Maytes({ createCheckout: async () => ({ checkoutId: 'x' }), environment: 'sandbox' }).renderButton(host);
    const css = [...document.head.querySelectorAll('style')].map((style) => style.textContent ?? '').join('\n');
    host.remove();
    return css;
  }

  function ruleBody(css: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    return match?.[1] ?? '';
  }

  it('keeps the base button rule free of white-space and box-sizing', () => {
    const base = ruleBody(injectedCss(), '.maytes-checkout-button');
    expect(base).not.toMatch(/white-space/);
    expect(base).not.toMatch(/box-sizing/);
    expect(base).toMatch(/border-radius:\s*var\(--maytes-button-radius,\s*999px\)/);
  });

  it('moves no-wrap and border-box into the sized modifier', () => {
    const sized = ruleBody(injectedCss(), '.maytes-checkout-button--sized');
    expect(sized).toMatch(/white-space:\s*nowrap/);
    expect(sized).toMatch(/box-sizing:\s*border-box/);
  });

  it('adds the sized modifier only when a height is set', () => {
    const maytes = Maytes({ createCheckout: async () => ({ checkoutId: 'x' }), environment: 'sandbox' });
    const plain = document.createElement('div');
    const rounded = document.createElement('div');
    const sized = document.createElement('div');
    document.body.append(plain, rounded, sized);
    maytes.renderButton(plain);
    maytes.renderButton(rounded, { radius: 6 });
    maytes.renderButton(sized, { radius: 6, height: 48 });
    expect(plain.querySelector('button')!.classList.contains('maytes-checkout-button--sized')).toBe(false);
    expect(rounded.querySelector('button')!.classList.contains('maytes-checkout-button--sized')).toBe(false);
    expect(sized.querySelector('button')!.classList.contains('maytes-checkout-button--sized')).toBe(true);
    plain.remove();
    rounded.remove();
    sized.remove();
  });
});

describe('public CSS custom properties', () => {
  beforeEach(() => {
    resetStylesForTests();
  });

  it('keeps the documented property names and defaults, so page CSS can style the button', () => {
    const css = injectedCss();
    expect(css).toContain('min-height: var(--maytes-button-height, auto);');
    expect(css).toContain('border-radius: var(--maytes-button-radius, 999px);');
    expect(css).toContain('font-size: var(--maytes-button-font-size, 14px);');
  });

  it('documents every public property in the API guide', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const guide = readFileSync(join(process.cwd(), 'docs', 'guides', 'api.md'), 'utf8');
    for (const property of ['--maytes-button-height', '--maytes-button-radius', '--maytes-button-font-size']) {
      expect(guide, `${property} is documented`).toContain(property);
    }
  });
});
