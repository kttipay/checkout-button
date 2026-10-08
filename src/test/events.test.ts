import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Maytes } from '../index.js';
import { makeFakePopup } from './fake-popup.js';
import { installFakeLocation } from './fake-location.js';
import { resetMaytesDomForTests } from './reset-dom.js';
import { detailOf } from './framing-fakes.js';

describe('checkout event details', () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;
  let container: HTMLElement;
  const listeners: Array<[string, ReturnType<typeof vi.fn>]> = [];

  function listen(name: string): ReturnType<typeof vi.fn> {
    const listener = vi.fn();
    document.addEventListener(name, listener);
    listeners.push([name, listener]);
    return listener;
  }

  beforeEach(() => {
    resetMaytesDomForTests();
    restoreLocation = installFakeLocation().restore;
    originalOpen = window.open;
    openSpy = vi.fn(() => makeFakePopup() as unknown as Window);
    window.open = openSpy as unknown as typeof window.open;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const [name, listener] of listeners.splice(0)) document.removeEventListener(name, listener);
    vi.useRealTimers();
    restoreLocation();
    window.open = originalOpen;
    container.remove();
    document.querySelectorAll('[data-maytes-overlay]').forEach((el) => el.remove());
  });

  it('a button click tags opened with the instance and source "button"', async () => {
    const opened = listen('maytes:checkout-opened');
    const maytes = Maytes({ createCheckout: async () => ({ checkoutId: 'o1' }), environment: 'sandbox' });
    maytes.renderButton(container);
    container.querySelector('button')!.click();
    await vi.waitFor(() => expect(opened).toHaveBeenCalled());
    expect(detailOf(opened)).toEqual({ instanceId: maytes.instanceId, source: 'button' });
  });

  it('closing the popup tags closed with the instance and source', () => {
    const popup = makeFakePopup();
    openSpy.mockReturnValueOnce(popup as unknown as Window);
    const closed = listen('maytes:checkout-closed');
    const maytes = Maytes({ createCheckout: () => new Promise(() => undefined), environment: 'sandbox' });
    maytes.renderButton(container);
    container.querySelector('button')!.click();
    popup.closed = true;
    vi.advanceTimersByTime(550);
    expect(detailOf(closed)).toEqual({ instanceId: maytes.instanceId, source: 'button' });
  });

  it('redirected and failed keep their fields and add instance and source', async () => {
    const redirected = listen('maytes:checkout-redirected');
    const failed = listen('maytes:checkout-failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const redirecting = Maytes({ createCheckout: async () => ({ checkoutId: 'r1' }), environment: 'sandbox' });
    redirecting.renderButton(container, { mode: 'redirect' });
    container.querySelector('button')!.click();
    await vi.waitFor(() => expect(redirected).toHaveBeenCalled());
    expect(detailOf(redirected)).toEqual({
      url: 'https://sandbox-checkout.maytes.co/?id=r1',
      target: 'self',
      instanceId: redirecting.instanceId,
      source: 'button',
    });

    const rejection = new Error('server down');
    const failing = Maytes({ createCheckout: async () => { throw rejection; }, environment: 'sandbox' });
    const second = document.createElement('div');
    document.body.appendChild(second);
    failing.renderButton(second, { mode: 'redirect' });
    second.querySelector('button')!.click();
    await vi.waitFor(() => expect(failed).toHaveBeenCalled());
    expect(detailOf(failed)).toEqual({
      reason: 'create-checkout-rejected',
      cause: rejection,
      instanceId: failing.instanceId,
      source: 'button',
    });
    second.remove();
    consoleError.mockRestore();
  });

  it('openCheckout() tags its events with source "api"', async () => {
    const opened = listen('maytes:checkout-opened');
    const redirected = listen('maytes:checkout-redirected');
    const popupInstance = Maytes({ createCheckout: async () => ({ checkoutId: 'a1' }), environment: 'sandbox' });
    await popupInstance.openCheckout();
    expect(detailOf(opened)).toEqual({ instanceId: popupInstance.instanceId, source: 'api' });

    const redirectInstance = Maytes({ createCheckout: async () => ({ checkoutId: 'a2' }), environment: 'sandbox' });
    await redirectInstance.openCheckout({ mode: 'redirect' });
    expect(detailOf(redirected)).toEqual({
      url: 'https://sandbox-checkout.maytes.co/?id=a2',
      target: 'self',
      instanceId: redirectInstance.instanceId,
      source: 'api',
    });
  });

  it('two instances on one page tell their events apart', async () => {
    const redirected = listen('maytes:checkout-redirected');
    const first = Maytes({ createCheckout: async () => ({ checkoutId: 'first' }), environment: 'sandbox' });
    const second = Maytes({ createCheckout: async () => ({ checkoutId: 'second' }), environment: 'sandbox' });
    const otherSlot = document.createElement('div');
    document.body.appendChild(otherSlot);
    first.renderButton(container, { mode: 'redirect' });
    second.renderButton(otherSlot, { mode: 'redirect' });

    otherSlot.querySelector('button')!.click();
    await vi.waitFor(() => expect(redirected).toHaveBeenCalledTimes(1));
    container.querySelector('button')!.click();
    await vi.waitFor(() => expect(redirected).toHaveBeenCalledTimes(2));

    const ids = redirected.mock.calls.map((call) => (call[0] as CustomEvent).detail.instanceId);
    expect(ids).toEqual([second.instanceId, first.instanceId]);
    expect(first.instanceId).not.toBe(second.instanceId);
    otherSlot.remove();
  });
});
