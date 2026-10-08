import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import type { CreateCheckoutFn, MaytesSDK } from '@maytes/checkout-button';
import { MaytesProvider, useMaytes } from '../react/index.js';
import { makeFakePopup, type FakePopup } from './fake-popup.js';
import { installFakeLocation } from './fake-location.js';
import { resetMaytesDomForTests } from './reset-dom.js';

const tracked = vi.hoisted(() => ({ instances: [] as Array<{ instance: MaytesSDK; destroyed: boolean }> }));

vi.mock('@maytes/checkout-button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@maytes/checkout-button')>();
  return {
    ...actual,
    Maytes: (...args: Parameters<typeof actual.Maytes>) => {
      const instance = actual.Maytes(...args);
      const record = { instance, destroyed: false };
      const destroy = instance.destroy.bind(instance);
      instance.destroy = () => {
        record.destroyed = true;
        destroy();
      };
      tracked.instances.push(record);
      return instance;
    },
  };
});

const live = () => tracked.instances.filter((record) => !record.destroyed);

let api!: ReturnType<typeof useMaytes>;
function Probe() {
  api = useMaytes();
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('MaytesProvider and useMaytes', () => {
  let restoreLocation: () => void;
  let assignSpy: ReturnType<typeof vi.fn>;
  let originalOpen: typeof window.open;
  let popup: FakePopup;

  beforeEach(() => {
    resetMaytesDomForTests();
    tracked.instances.length = 0;
    const fakeLocation = installFakeLocation();
    restoreLocation = fakeLocation.restore;
    assignSpy = fakeLocation.assignSpy;
    originalOpen = window.open;
    popup = makeFakePopup();
    window.open = vi.fn(() => popup as unknown as Window) as unknown as typeof window.open;
  });

  afterEach(() => {
    cleanup();
    restoreLocation();
    window.open = originalOpen;
    vi.restoreAllMocks();
  });

  const checkout: CreateCheckoutFn = async () => ({ checkoutId: 'c-1' });

  it('creates one instance per provider and destroys it on unmount', () => {
    const { unmount } = render(<MaytesProvider environment="sandbox" createCheckout={checkout}><Probe /></MaytesProvider>);
    expect(live()).toHaveLength(1);
    unmount();
    expect(live()).toHaveLength(0);
  });

  it('leaves exactly one live instance under StrictMode', () => {
    render(<StrictMode><MaytesProvider environment="sandbox" createCheckout={checkout}><Probe /></MaytesProvider></StrictMode>);
    expect(live()).toHaveLength(1);
  });

  it('uses the latest createCheckout without re-creating the instance', async () => {
    const first = vi.fn(async () => ({ checkoutId: 'first' }));
    const second = vi.fn(async () => ({ checkoutId: 'second' }));
    const { rerender } = render(<MaytesProvider environment="sandbox" createCheckout={first}><Probe /></MaytesProvider>);
    rerender(<MaytesProvider environment="sandbox" createCheckout={second}><Probe /></MaytesProvider>);

    let result: unknown;
    await act(async () => { result = await api.openCheckout({ mode: 'redirect' }); });

    expect(tracked.instances).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(result).toEqual({ outcome: 'redirected', target: 'self' });
    expect(assignSpy).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=second');
  });

  it('replaces the instance when the environment changes', () => {
    const { rerender } = render(<MaytesProvider environment="sandbox" createCheckout={checkout}><Probe /></MaytesProvider>);
    const [firstRecord] = tracked.instances;
    rerender(<MaytesProvider environment="production" createCheckout={checkout}><Probe /></MaytesProvider>);
    expect(firstRecord?.destroyed).toBe(true);
    expect(live()).toHaveLength(1);
    expect(live()[0]).not.toBe(firstRecord);
  });

  it('busy follows the launch', async () => {
    const pending = deferred<{ checkoutId: string }>();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<MaytesProvider environment="sandbox" createCheckout={() => pending.promise}><Probe /></MaytesProvider>);
    expect(api.busy).toBe(false);

    let launch!: Promise<unknown>;
    act(() => { launch = api.openCheckout({ mode: 'redirect' }); });
    expect(api.busy).toBe(true);

    await act(async () => {
      pending.reject(new Error('create failed'));
      await launch;
    });
    expect(api.busy).toBe(false);
  });

  it('unmounting mid-launch closes the unfinished popup and never navigates', async () => {
    const pending = deferred<{ checkoutId: string }>();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { unmount } = render(<MaytesProvider environment="sandbox" createCheckout={() => pending.promise}><Probe /></MaytesProvider>);

    act(() => { void api.openCheckout({ mode: 'popup' }); });
    unmount();
    await act(async () => { pending.resolve({ checkoutId: 'late' }); });

    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
    expect(consoleError.mock.calls.some((call) => String(call[0]).includes('unmounted component'))).toBe(false);
  });

  it('openCheckout resolves ignored before the instance exists', async () => {
    let early: Promise<unknown> | undefined;
    function EarlyProbe() {
      const { openCheckout } = useMaytes();
      if (early === undefined) early = openCheckout();
      return null;
    }
    render(<MaytesProvider environment="sandbox" createCheckout={checkout}><EarlyProbe /></MaytesProvider>);
    await expect(early).resolves.toEqual({ outcome: 'ignored' });
  });

  it('useMaytes outside the provider throws a clear error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useMaytes() must be used inside <MaytesProvider>.');
  });
});
