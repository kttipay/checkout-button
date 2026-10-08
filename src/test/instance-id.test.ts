import { describe, it, expect, vi, afterEach } from 'vitest';
import { Maytes } from '../index.js';
import { createInstanceState } from '../state.js';

const options = { createCheckout: async () => ({ checkoutId: 'x' }), environment: 'sandbox' as const };

describe('instanceId', () => {
  const originalRandomUUID = crypto.randomUUID;

  afterEach(() => {
    crypto.randomUUID = originalRandomUUID;
  });

  it('is a UUID when crypto.randomUUID is available', () => {
    expect(createInstanceState(options, undefined).instanceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('falls back to a timestamp/random id when crypto.randomUUID is unavailable', () => {
    // @ts-expect-error -- simulating an environment without crypto.randomUUID
    crypto.randomUUID = undefined;
    expect(createInstanceState(options, undefined).instanceId).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
  });

  it('falls back when crypto.randomUUID throws', () => {
    crypto.randomUUID = vi.fn(() => { throw new Error('unsupported'); }) as typeof crypto.randomUUID;
    expect(createInstanceState(options, undefined).instanceId).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
  });

  it('is exposed on the SDK, stable across reads, and different per instance', () => {
    const first = Maytes(options);
    const second = Maytes(options);
    expect(first.instanceId).toBe(first.instanceId);
    expect(first.instanceId).not.toBe(second.instanceId);
  });

  it('is not the popup name', () => {
    const state = createInstanceState(options, undefined);
    expect(state.popupName).not.toContain(state.instanceId);
  });
});
