import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Maytes, MaytesError, MaytesErrorCode } from '../index.js';
import { makeFakePopup } from './fake-popup.js';
import { installFakeLocation } from './fake-location.js';
import { resetMaytesDomForTests } from './reset-dom.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('maytes.onBusyChange', () => {
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;
  let container: HTMLElement;

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
    vi.restoreAllMocks();
  });

  it('reports true while a button launch is in flight and false when it fails', async () => {
    const checkout = deferred<{ checkoutId: string }>();
    const maytes = Maytes({ environment: 'sandbox', createCheckout: () => checkout.promise });
    const seen: boolean[] = [];
    maytes.onBusyChange((busy) => seen.push(busy));
    maytes.renderButton(container);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    container.querySelector('button')!.click();
    expect(seen).toEqual([true]);

    checkout.reject(new Error('create failed'));
    await vi.waitFor(() => expect(seen).toEqual([true, false]));
  });

  it('reports launches started with openCheckout', async () => {
    const checkout = deferred<{ checkoutId: string }>();
    const maytes = Maytes({ environment: 'sandbox', createCheckout: () => checkout.promise });
    const seen: boolean[] = [];
    maytes.onBusyChange((busy) => seen.push(busy));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const launch = maytes.openCheckout({ mode: 'redirect' });
    expect(seen).toEqual([true]);
    checkout.reject(new Error('create failed'));
    await launch;
    expect(seen).toEqual([true, false]);
  });

  it('stops reporting after the returned function is called', () => {
    const maytes = Maytes({ environment: 'sandbox', createCheckout: () => new Promise(() => undefined) });
    const listener = vi.fn();
    const stop = maytes.onBusyChange(listener);
    stop();
    maytes.renderButton(container);
    container.querySelector('button')!.click();
    expect(listener).not.toHaveBeenCalled();
  });

  it('throws CONFIG on a destroyed instance', () => {
    const maytes = Maytes({ environment: 'sandbox', createCheckout: async () => ({ checkoutId: 'x' }) });
    maytes.destroy();
    try {
      maytes.onBusyChange(() => undefined);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(MaytesError);
      expect((e as MaytesError).code).toBe(MaytesErrorCode.Config);
    }
  });
});
