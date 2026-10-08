import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Maytes, MaytesError, MaytesErrorCode } from '../index.js';
import { crossOriginTopWindow, detailOf, withScreenWidth, withTop } from './framing-fakes.js';
import { makeFakePopup, type FakePopup } from './fake-popup.js';
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

function listen(type: string): ReturnType<typeof vi.fn> {
  const listener = vi.fn();
  document.addEventListener(type, listener);
  listeners.push([type, listener]);
  return listener;
}

const listeners: Array<[string, ReturnType<typeof vi.fn>]> = [];

describe('maytes.openCheckout', () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;
  let popup: FakePopup;

  beforeEach(() => {
    resetMaytesDomForTests();
    const fakeLocation = installFakeLocation();
    assignSpy = fakeLocation.assignSpy;
    restoreLocation = fakeLocation.restore;
    originalOpen = window.open;
    popup = makeFakePopup();
    openSpy = vi.fn(() => popup as unknown as Window);
    window.open = openSpy as unknown as typeof window.open;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreLocation();
    window.open = originalOpen;
    for (const [type, listener] of listeners.splice(0)) document.removeEventListener(type, listener);
    document.querySelectorAll('[data-maytes-overlay]').forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it('opens the blank popup during the call, before createCheckout runs', async () => {
    const pending = deferred();
    const createCheckout = vi.fn(() => pending.promise);
    const launch = instance(createCheckout).openCheckout();
    expect(openSpy).toHaveBeenCalledOnce();
    expect(openSpy.mock.calls[0]?.[0]).toBe('about:blank');
    expect(popup.location.replace).not.toHaveBeenCalled();
    pending.resolve({ checkoutId: 'ck_sync' });
    await expect(launch).resolves.toEqual({ outcome: 'popup' });
  });

  it('navigates the popup to the checkout, shows the overlay and announces it was opened', async () => {
    const opened = listen('maytes:checkout-opened');
    const result = await instance(async () => ({ checkoutId: 'ck_1' })).openCheckout({ mode: 'popup' });
    expect(result).toEqual({ outcome: 'popup' });
    expect(popup.location.replace).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=ck_1');
    expect(opened).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-maytes-overlay]')).not.toBeNull();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('uses the checkoutUrl createCheckout returns', async () => {
    await instance(async () => ({ checkoutId: 'ck_2', checkoutUrl: 'https://checkout.example/?id=ck_2' })).openCheckout();
    expect(popup.location.replace).toHaveBeenCalledWith('https://checkout.example/?id=ck_2');
  });

  it('redirects on a phone-width window instead of opening a popup', async () => {
    const redirected = listen('maytes:checkout-redirected');
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 });
    try {
      const result = await instance(async () => ({ checkoutId: 'ck_m' })).openCheckout();
      expect(result).toEqual({ outcome: 'redirected', target: 'self' });
      expect(openSpy).not.toHaveBeenCalled();
      expect(assignSpy).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=ck_m');
      expect(detailOf(redirected)).toEqual({ url: 'https://sandbox-checkout.maytes.co/?id=ck_m', target: 'self' });
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });

  it("never opens a popup in mode: 'redirect'", async () => {
    const result = await instance(async () => ({ checkoutId: 'ck_r' })).openCheckout({ mode: 'redirect' });
    expect(result).toEqual({ outcome: 'redirected', target: 'self' });
    expect(openSpy).not.toHaveBeenCalled();
    expect(document.querySelector('[data-maytes-overlay]')).toBeNull();
  });

  it('falls back to a redirect when the popup is blocked, for example when called after an await', async () => {
    openSpy.mockReturnValueOnce(null);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failed = listen('maytes:checkout-failed');
    const result = await instance(async () => ({ checkoutId: 'ck_b' })).openCheckout();
    expect(result).toEqual({ outcome: 'redirected', target: 'self' });
    expect(assignSpy).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=ck_b');
    expect(warn).toHaveBeenCalledWith('[maytes/checkout-button] popup was blocked; redirecting instead');
    expect(failed).not.toHaveBeenCalled();
  });

  it('resolves failed and never rejects when createCheckout rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = listen('maytes:checkout-failed');
    const boom = new Error('server down');
    const result = await instance(async () => { throw boom; }).openCheckout();
    expect(result).toEqual({ outcome: 'failed', reason: 'create-checkout-rejected' });
    expect(popup.close).toHaveBeenCalled();
    expect(document.querySelector('[data-maytes-overlay]')).toBeNull();
    expect(detailOf(failed)).toEqual({ reason: 'create-checkout-rejected', cause: boom });
  });

  it('resolves failed when createCheckout returns the wrong shape', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await instance(async () => ({ id: 'nope' }) as unknown as { checkoutId: string }).openCheckout();
    expect(result).toEqual({ outcome: 'failed', reason: 'invalid-shape' });
    expect(popup.close).toHaveBeenCalled();
  });

  it('ignores a second call while the first launch is in flight', async () => {
    const pending = deferred();
    const createCheckout = vi.fn(() => pending.promise);
    const maytes = instance(createCheckout);
    const first = maytes.openCheckout();
    await expect(maytes.openCheckout()).resolves.toEqual({ outcome: 'ignored' });
    expect(createCheckout).toHaveBeenCalledOnce();
    pending.resolve({ checkoutId: 'ck_once' });
    await expect(first).resolves.toEqual({ outcome: 'popup' });
  });

  it('throws CONFIG on a destroyed instance', () => {
    const maytes = instance();
    maytes.destroy();
    try {
      void maytes.openCheckout();
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(MaytesError);
      expect((e as MaytesError).code).toBe(MaytesErrorCode.Config);
    }
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('throws CONFIG naming openCheckout when mode is not popup or redirect', () => {
    expect(() => instance().openCheckout({ mode: 'inline' as unknown as 'popup' })).toThrow(
      "openCheckout({ mode }) must be 'redirect' or 'popup'",
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('resolves failed when an embedding cross-origin frame refuses every way out', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const blocked = new DOMException('blocked', 'SecurityError');
    openSpy.mockReturnValue(null);
    let result: unknown;
    await withScreenWidth(390, () => withTop(crossOriginTopWindow(() => { throw blocked; }), async () => {
      result = await instance(async () => ({ checkoutId: 'ck_f' })).openCheckout();
    }));
    expect(result).toEqual({ outcome: 'failed', reason: 'navigation-blocked' });
  });

  it('resolves closed and leaves no overlay when destroyed while createCheckout is pending', async () => {
    const pending = deferred();
    const maytes = instance(() => pending.promise);
    const launch = maytes.openCheckout();
    maytes.destroy();
    pending.resolve({ checkoutId: 'ck_d' });
    await expect(launch).resolves.toEqual({ outcome: 'closed' });
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(document.querySelector('[data-maytes-overlay]')).toBeNull();
  });

  it('resolves closed when the customer closes the popup before the checkout loads', async () => {
    const closed = listen('maytes:checkout-closed');
    const pending = deferred();
    const launch = instance(() => pending.promise).openCheckout();
    popup.closed = true;
    vi.advanceTimersByTime(550);
    expect(closed).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-maytes-overlay]')).toBeNull();
    pending.resolve({ checkoutId: 'ck_late' });
    await expect(launch).resolves.toEqual({ outcome: 'closed' });
    expect(popup.location.replace).not.toHaveBeenCalled();
  });
});

describe('busy state across buttons and openCheckout (unchanged from 1.1)', () => {
  let container: HTMLElement;
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;

  beforeEach(() => {
    resetMaytesDomForTests();
    restoreLocation = installFakeLocation().restore;
    originalOpen = window.open;
    window.open = vi.fn(() => makeFakePopup() as unknown as Window) as unknown as typeof window.open;
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

  it('keeps a rendered button looking as it did in 1.1, but ignores its clicks, while openCheckout is in flight', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = deferred();
    const createCheckout = vi.fn(() => pending.promise);
    const maytes = instance(createCheckout);
    maytes.renderButton(container);
    const button = container.querySelector('button')!;
    const launch = maytes.openCheckout();
    expect(button.getAttribute('aria-busy')).toBeNull();
    button.click();
    expect(createCheckout).toHaveBeenCalledOnce();
    pending.reject(new Error('nope'));
    await launch;
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.querySelector('.maytes-checkout-button__logo')).not.toBeNull();
  });

  it('ignores openCheckout while a rendered button launch is in flight', async () => {
    const pending = deferred();
    const createCheckout = vi.fn(() => pending.promise);
    const maytes = instance(createCheckout);
    maytes.renderButton(container);
    container.querySelector('button')!.click();
    await expect(maytes.openCheckout()).resolves.toEqual({ outcome: 'ignored' });
    expect(createCheckout).toHaveBeenCalledOnce();
  });

  it('shows the spinner only on the clicked button, as in 1.1, while its sibling ignores clicks', () => {
    const pending = deferred();
    const createCheckout = vi.fn(() => pending.promise);
    const maytes = instance(createCheckout);
    const second = document.createElement('div');
    document.body.appendChild(second);
    maytes.renderButton(container);
    maytes.renderButton(second);
    container.querySelector('button')!.click();
    expect(container.querySelector('button')!.getAttribute('aria-busy')).toBe('true');
    const sibling = second.querySelector('button')!;
    expect(sibling.getAttribute('aria-busy')).toBeNull();
    sibling.click();
    expect(createCheckout).toHaveBeenCalledOnce();
    second.remove();
  });

  it('renders a new button idle, as in 1.1, when a launch is already in flight', () => {
    const pending = deferred();
    const maytes = instance(() => pending.promise);
    void maytes.openCheckout();
    maytes.renderButton(container);
    expect(container.querySelector('button')!.getAttribute('aria-busy')).toBeNull();
  });

  it('returns the clicked button to its logo when its popup closes', async () => {
    const pending = deferred();
    const maytes = instance(() => pending.promise);
    maytes.renderButton(container);
    const button = container.querySelector('button')!;
    button.click();
    expect(button.getAttribute('aria-busy')).toBe('true');
    pending.resolve({ checkoutId: 'ck_close' });
    await vi.waitFor(() => expect(document.querySelector('[data-maytes-overlay]')).not.toBeNull());
    const popup = (window.open as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value as { closed: boolean };
    popup.closed = true;
    await vi.waitFor(() => expect(button.getAttribute('aria-busy')).toBeNull(), { timeout: 2000 });
    expect(button.querySelector('.maytes-checkout-button__logo')).not.toBeNull();
  });
});
