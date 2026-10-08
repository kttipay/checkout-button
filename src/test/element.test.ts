import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MAYTES_CHECKOUT_BUTTON_TAG,
  MaytesCheckoutButtonElement,
  defineMaytesCheckoutButton,
  readButtonOptions,
} from '../element.js';
import { makeFakePopup, type FakePopup } from './fake-popup.js';
import { installFakeLocation } from './fake-location.js';
import { resetMaytesDomForTests } from './reset-dom.js';
import { MaytesError } from '../index.js';

type Pending = { promise: Promise<{ checkoutId: string }>; resolve: (v: { checkoutId: string }) => void };

function pending(): Pending {
  let resolve!: Pending['resolve'];
  const promise = new Promise<{ checkoutId: string }>((res) => { resolve = res; });
  return { promise, resolve };
}

function element(attributes: Record<string, string> = { environment: 'sandbox' }): MaytesCheckoutButtonElement {
  const el = document.createElement('maytes-checkout-button');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  return el;
}

function sdkButton(el: Element): HTMLButtonElement | null {
  return el.querySelector('button.maytes-checkout-button');
}

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

describe('<maytes-checkout-button> rendering', () => {
  let popup: FakePopup;
  let openSpy: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;

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
    document.body.replaceChildren();
    document.querySelectorAll('[data-maytes-overlay]').forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it('renders nothing until createCheckout is set', () => {
    const el = element();
    document.body.appendChild(el);
    expect(sdkButton(el)).toBeNull();
    expect(el.instanceId).toBeNull();
  });

  it('renders once createCheckout is set after connecting, into its light DOM', () => {
    const el = element();
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    expect(sdkButton(el)).not.toBeNull();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelectorAll('button').length).toBe(1);
    expect(el.instanceId).toMatch(/.+/);
  });

  it('renders when connected after createCheckout was set', () => {
    const el = element();
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    expect(sdkButton(el)).toBeNull();
    document.body.appendChild(el);
    expect(sdkButton(el)).not.toBeNull();
  });

  it('uses a replaced createCheckout without re-creating the button', async () => {
    const el = element();
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'first' });
    const button = sdkButton(el);
    const second = vi.fn(async () => ({ checkoutId: 'second' }));
    el.createCheckout = second;
    expect(sdkButton(el)).toBe(button);
    button!.click();
    await vi.waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=second'));
    expect(second).toHaveBeenCalledOnce();
  });

  it('maps attributes to button options', () => {
    const el = element({ environment: 'sandbox', label: 'Pay with friends', block: '', radius: '6', height: '48' });
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    const button = sdkButton(el)!;
    expect(button.getAttribute('aria-label')).toBe('Pay with friends Maytes');
    expect(button.classList.contains('maytes-checkout-button--block')).toBe(true);
    expect(button.style.getPropertyValue('--maytes-button-radius')).toBe('6px');
    expect(button.style.getPropertyValue('--maytes-button-height')).toBe('48px');
  });

  it('reads options without inventing values for missing attributes', () => {
    expect(readButtonOptions(element({ environment: 'sandbox' }))).toEqual({ block: false });
    expect(readButtonOptions(element({ mode: 'redirect', radius: ' ' }))).toEqual({ block: false, mode: 'redirect' });
  });

  it("follows mode='redirect'", async () => {
    const el = element({ environment: 'sandbox', mode: 'redirect' });
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'red' });
    sdkButton(el)!.click();
    await vi.waitFor(() => expect(assignSpy).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=red'));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('passes the nonce to the injected styles', () => {
    const el = element({ environment: 'sandbox', nonce: 'n0nce' });
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    expect(document.head.querySelector('style[data-maytes-checkout-button]')?.getAttribute('nonce')).toBe('n0nce');
  });

  it('removes the button and destroys the instance once disconnected', async () => {
    const el = element();
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    el.remove();
    await Promise.resolve();
    expect(sdkButton(el)).toBeNull();
    expect(el.instanceId).toBeNull();
  });

  it('closes an unloaded popup when removed during a launch', async () => {
    const launch = pending();
    const el = element();
    document.body.appendChild(el);
    el.createCheckout = () => launch.promise;
    sdkButton(el)!.click();
    el.remove();
    await Promise.resolve();
    expect(popup.close).toHaveBeenCalled();
    expect(document.querySelector('[data-maytes-overlay]')).toBeNull();
  });

  it('moving the element keeps an in-flight launch', async () => {
    const launch = pending();
    const el = element();
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    first.appendChild(el);
    el.createCheckout = () => launch.promise;
    sdkButton(el)!.click();
    second.appendChild(el);
    await Promise.resolve();
    expect(popup.close).not.toHaveBeenCalled();
    launch.resolve({ checkoutId: 'moved' });
    await vi.waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=moved'));
  });
  it('re-renders the button when label changes, keeping an in-flight launch', async () => {
    const launch = pending();
    const createCheckout = vi.fn(() => launch.promise);
    const el = element();
    document.body.appendChild(el);
    el.createCheckout = createCheckout;
    const instanceId = el.instanceId;
    sdkButton(el)!.click();
    el.setAttribute('label', 'Split it');
    expect(sdkButton(el)!.getAttribute('aria-label')).toBe('Split it Maytes');
    expect(el.querySelectorAll('button').length).toBe(1);
    sdkButton(el)!.click();
    expect(createCheckout).toHaveBeenCalledOnce();
    expect(el.instanceId).toBe(instanceId);
    expect(popup.close).not.toHaveBeenCalled();
    launch.resolve({ checkoutId: 'kept' });
    await vi.waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://sandbox-checkout.maytes.co/?id=kept'));
  });

  it('re-creates the instance when environment changes', () => {
    const el = element();
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    const before = el.instanceId;
    el.setAttribute('environment', 'production');
    expect(el.instanceId).not.toBe(before);
    expect(el.instanceId).not.toBeNull();
    expect(el.querySelectorAll('button').length).toBe(1);
  });

  it('reports an invalid environment as maytes-failed instead of throwing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = vi.fn();
    const el = element({ environment: 'live' });
    el.addEventListener('maytes-failed', failed);
    document.body.appendChild(el);
    expect(() => { el.createCheckout = async () => ({ checkoutId: 'ck' }); }).not.toThrow();
    expect(sdkButton(el)).toBeNull();
    const detail = (failed.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(detail.reason).toBe('config');
    expect(detail.cause).toBeInstanceOf(MaytesError);
    expect(error).toHaveBeenCalled();
  });

  it('reports an invalid height and keeps the last valid button', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = vi.fn();
    const el = element({ environment: 'sandbox', height: '48' });
    el.addEventListener('maytes-failed', failed);
    document.body.appendChild(el);
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    el.setAttribute('height', 'tall');
    expect((failed.mock.calls[0]?.[0] as CustomEvent).detail.reason).toBe('config');
    expect(el.querySelectorAll('button').length).toBe(1);
    expect(sdkButton(el)!.style.getPropertyValue('--maytes-button-height')).toBe('48px');
  });

  it('ignores attribute changes before the element can render', () => {
    const el = element();
    document.body.appendChild(el);
    el.setAttribute('label', 'Later');
    expect(sdkButton(el)).toBeNull();
    el.createCheckout = async () => ({ checkoutId: 'ck' });
    expect(sdkButton(el)!.getAttribute('aria-label')).toBe('Later Maytes');
  });
});

