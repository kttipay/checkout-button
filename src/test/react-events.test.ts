import { describe, it, expect, afterEach, vi } from 'vitest';
import { listenToInstanceEvents } from '../react/events.js';

function dispatch(name: string, detail: Record<string, unknown>) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

describe('listenToInstanceEvents', () => {
  const stops: Array<() => void> = [];
  afterEach(() => { stops.splice(0).forEach((stop) => stop()); });

  it('forwards each event of its own instance and source to the matching handler', () => {
    const handlers = { onOpened: vi.fn(), onClosed: vi.fn(), onRedirected: vi.fn(), onFailed: vi.fn() };
    stops.push(listenToInstanceEvents(document, 'i-1', 'button', () => handlers));

    dispatch('maytes:checkout-opened', { instanceId: 'i-1', source: 'button' });
    dispatch('maytes:checkout-closed', { instanceId: 'i-1', source: 'button' });
    dispatch('maytes:checkout-redirected', { instanceId: 'i-1', source: 'button', url: 'https://x', target: 'self' });
    dispatch('maytes:checkout-failed', { instanceId: 'i-1', source: 'button', reason: 'invalid-shape' });

    expect(handlers.onOpened).toHaveBeenCalledOnce();
    expect(handlers.onClosed).toHaveBeenCalledOnce();
    expect(handlers.onRedirected).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://x', target: 'self' }));
    expect(handlers.onFailed).toHaveBeenCalledWith(expect.objectContaining({ reason: 'invalid-shape' }));
  });

  it('ignores other instances, other sources and events without a detail', () => {
    const onFailed = vi.fn();
    stops.push(listenToInstanceEvents(document, 'i-1', 'button', () => ({ onFailed })));

    dispatch('maytes:checkout-failed', { instanceId: 'i-2', source: 'button', reason: 'invalid-shape' });
    dispatch('maytes:checkout-failed', { instanceId: 'i-1', source: 'api', reason: 'invalid-shape' });
    document.dispatchEvent(new CustomEvent('maytes:checkout-failed'));

    expect(onFailed).not.toHaveBeenCalled();
  });

  it('calls the latest handlers and stops after the returned function', () => {
    let current = vi.fn();
    const stop = listenToInstanceEvents(document, 'i-1', 'button', () => ({ onOpened: current }));
    const replaced = current;
    current = vi.fn();
    dispatch('maytes:checkout-opened', { instanceId: 'i-1', source: 'button' });
    expect(replaced).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();

    stop();
    dispatch('maytes:checkout-opened', { instanceId: 'i-1', source: 'button' });
    expect(current).toHaveBeenCalledOnce();
  });
});
