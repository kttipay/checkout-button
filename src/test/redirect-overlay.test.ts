import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Maytes, MaytesError, MaytesErrorCode } from '../index.js';
import { crossOriginTopWindow, withScreenWidth, withTop } from './framing-fakes.js';
import { makeFakePopup } from './fake-popup.js';
import { installFakeLocation } from './fake-location.js';
import { resetMaytesDomForTests } from './reset-dom.js';
import type { CreateCheckoutFn, MaytesSDK } from '../types.js';

type Deferred = { promise: Promise<{ checkoutId: string }>; resolve: (v: { checkoutId: string }) => void; reject: (e: unknown) => void };

function deferred(): Deferred {
  let resolve!: Deferred['resolve'];
  let reject!: Deferred['reject'];
  const promise = new Promise<{ checkoutId: string }>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function instance(createCheckout: CreateCheckoutFn = async () => ({ checkoutId: 'ck' })): MaytesSDK {
  return Maytes({ createCheckout, environment: 'sandbox' });
}

function overlay(): HTMLDialogElement | null {
  return document.querySelector('[data-maytes-overlay]');
}

function firePageShow(persisted: boolean): void {
  const event = new Event('pageshow') as Event & { persisted: boolean };
  Object.defineProperty(event, 'persisted', { value: persisted });
  window.dispatchEvent(event);
}

describe('redirectOverlay', () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;
  let container: HTMLElement;

  beforeEach(() => {
    resetMaytesDomForTests();
    const fakeLocation = installFakeLocation();
    assignSpy = fakeLocation.assignSpy;
    restoreLocation = fakeLocation.restore;
    originalOpen = window.open;
    openSpy = vi.fn(() => makeFakePopup() as unknown as Window);
    window.open = openSpy as unknown as typeof window.open;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    restoreLocation();
    window.open = originalOpen;
    container.remove();
    document.querySelectorAll('[data-maytes-overlay]').forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it('shows no overlay on a redirect by default, as in 1.1', async () => {
    const pending = deferred();
    instance(() => pending.promise).renderButton(container, { mode: 'redirect' });
    container.querySelector('button')!.click();
    expect(overlay()).toBeNull();
    pending.resolve({ checkoutId: 'ck_default' });
    await vi.waitFor(() => expect(assignSpy).toHaveBeenCalled());
    expect(overlay()).toBeNull();
  });

  it('shows the overlay while createCheckout runs when opted in', async () => {
    const pending = deferred();
    instance(() => pending.promise).renderButton(container, { mode: 'redirect', redirectOverlay: true });
    container.querySelector('button')!.click();
    const shown = overlay();
    expect(shown).not.toBeNull();
    expect(shown!.textContent).toContain('Taking you to Maytes…');
    expect(shown!.querySelector('.maytes-checkout-overlay__link')).toBeNull();
    pending.resolve({ checkoutId: 'ck_opt' });
    await vi.waitFor(() => expect(assignSpy).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=ck_opt'));
  });

  it('leaves the overlay up once the page starts navigating', async () => {
    const result = await instance(async () => ({ checkoutId: 'ck_nav' })).openCheckout({ mode: 'redirect', redirectOverlay: true });
    expect(result).toEqual({ outcome: 'redirected', target: 'self' });
    expect(overlay()).not.toBeNull();
  });

  it('shows it on a phone-width window when opted in', async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      const pending = deferred();
      const launch = instance(() => pending.promise).openCheckout({ redirectOverlay: true });
      expect(openSpy).not.toHaveBeenCalled();
      expect(overlay()).not.toBeNull();
      pending.resolve({ checkoutId: 'ck_phone' });
      await expect(launch).resolves.toEqual({ outcome: 'redirected', target: 'self' });
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });

  it('shows it when the popup is blocked and opted in', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    openSpy.mockReturnValueOnce(null);
    const pending = deferred();
    const launch = instance(() => pending.promise).openCheckout({ redirectOverlay: true });
    expect(overlay()).not.toBeNull();
    expect(overlay()!.querySelector('.maytes-checkout-overlay__link')).toBeNull();
    pending.resolve({ checkoutId: 'ck_blocked' });
    await expect(launch).resolves.toEqual({ outcome: 'redirected', target: 'self' });
  });

  it('hides it and re-enables the button when createCheckout fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = deferred();
    instance(() => pending.promise).renderButton(container, { mode: 'redirect', redirectOverlay: true });
    const button = container.querySelector('button')!;
    button.click();
    expect(overlay()).not.toBeNull();
    pending.reject(new Error('server down'));
    await vi.waitFor(() => expect(overlay()).toBeNull());
    expect(button.getAttribute('aria-busy')).toBeNull();
  });

  it('hides it when the checkout has the wrong shape', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await instance(async () => ({ id: 'nope' }) as unknown as { checkoutId: string }).openCheckout({ mode: 'redirect', redirectOverlay: true });
    expect(result).toEqual({ outcome: 'failed', reason: 'invalid-shape' });
    expect(overlay()).toBeNull();
  });

  it('hides it when an embedding frame refuses every way out', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    openSpy.mockReturnValue(null);
    let result: unknown;
    await withScreenWidth(390, () => withTop(crossOriginTopWindow(() => { throw new DOMException('blocked', 'SecurityError'); }), async () => {
      result = await instance(async () => ({ checkoutId: 'ck_frame' })).openCheckout({ redirectOverlay: true });
    }));
    expect(result).toEqual({ outcome: 'failed', reason: 'navigation-blocked' });
    expect(overlay()).toBeNull();
  });

  it('clears the overlay and the busy state when the page comes back from the back/forward cache', async () => {
    const maytes = instance(async () => ({ checkoutId: 'ck_back' }));
    maytes.renderButton(container, { mode: 'redirect', redirectOverlay: true });
    const button = container.querySelector('button')!;
    button.click();
    await vi.waitFor(() => expect(assignSpy).toHaveBeenCalled());
    expect(overlay()).not.toBeNull();
    firePageShow(false);
    expect(overlay()).not.toBeNull();
    firePageShow(true);
    expect(overlay()).toBeNull();
    expect(button.getAttribute('aria-busy')).toBeNull();
  });

  it('lets the button launch again after a back/forward restore', async () => {
    const createCheckout = vi.fn(async () => ({ checkoutId: 'ck_twice' }));
    instance(createCheckout).renderButton(container, { mode: 'redirect', redirectOverlay: true });
    const button = container.querySelector('button')!;
    button.click();
    await vi.waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));
    firePageShow(true);
    button.click();
    await vi.waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(2));
    expect(createCheckout).toHaveBeenCalledTimes(2);
  });

  it('stops listening for back/forward restores after destroy()', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const maytes = instance(async () => ({ checkoutId: 'ck_destroy' }));
    await maytes.openCheckout({ mode: 'redirect', redirectOverlay: true });
    maytes.destroy();
    expect(removeSpy.mock.calls.some(([type]) => type === 'pageshow')).toBe(true);
  });

  it('leaves popup mode unchanged when opted in', async () => {
    const popup = makeFakePopup();
    openSpy.mockReturnValueOnce(popup as unknown as Window);
    const result = await instance(async () => ({ checkoutId: 'ck_pop' })).openCheckout({ redirectOverlay: true });
    expect(result).toEqual({ outcome: 'popup' });
    const shown = overlay();
    expect(shown).not.toBeNull();
    expect(shown!.textContent).toContain('Completing checkout with Maytes…');
    expect(shown!.querySelector('.maytes-checkout-overlay__link')).not.toBeNull();
  });

  it('throws CONFIG when redirectOverlay is not a boolean', () => {
    const maytes = instance();
    for (const call of [
      () => maytes.renderButton(container, { redirectOverlay: 'yes' as unknown as boolean }),
      () => maytes.openCheckout({ redirectOverlay: 1 as unknown as boolean }),
    ]) {
      try {
        call();
        expect.fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(MaytesError);
        expect((e as MaytesError).code).toBe(MaytesErrorCode.Config);
        expect((e as MaytesError).message).toMatch(/redirectOverlay/);
      }
    }
  });
});
