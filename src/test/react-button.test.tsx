import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { MaytesButton, MaytesProvider, useMaytes } from '../react/index.js';
import { installFakeLocation } from './fake-location.js';
import { makeFakePopup } from './fake-popup.js';
import { resetMaytesDomForTests } from './reset-dom.js';

const failing = async (): Promise<{ checkoutId: string }> => { throw new Error('create failed'); };

describe('MaytesButton', () => {
  let restoreLocation: () => void;
  let originalOpen: typeof window.open;

  beforeEach(() => {
    resetMaytesDomForTests();
    restoreLocation = installFakeLocation().restore;
    originalOpen = window.open;
    window.open = vi.fn(() => makeFakePopup() as unknown as Window) as unknown as typeof window.open;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    restoreLocation();
    window.open = originalOpen;
    vi.restoreAllMocks();
  });

  it('renders exactly one SDK button, also under StrictMode', () => {
    const { container } = render(
      <StrictMode>
        <MaytesProvider environment="sandbox" createCheckout={failing}>
          <MaytesButton block />
        </MaytesProvider>
      </StrictMode>,
    );
    const buttons = container.querySelectorAll('button.maytes-checkout-button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.classList.contains('maytes-checkout-button--block')).toBe(true);
  });

  it('passes radius and height through to the SDK button', () => {
    const { container } = render(
      <MaytesProvider environment="sandbox" createCheckout={failing}>
        <MaytesButton radius={6} height={48} />
      </MaytesProvider>,
    );
    const button = container.querySelector<HTMLButtonElement>('button.maytes-checkout-button')!;
    expect(button.style.getPropertyValue('--maytes-button-radius')).toBe('6px');
    expect(button.style.getPropertyValue('--maytes-button-height')).toBe('48px');
  });

  it('re-renders on option changes without leaving a second button', () => {
    const { container, rerender } = render(
      <MaytesProvider environment="sandbox" createCheckout={failing}><MaytesButton label="Split with" /></MaytesProvider>,
    );
    rerender(<MaytesProvider environment="sandbox" createCheckout={failing}><MaytesButton label="Pay with" /></MaytesProvider>);
    const buttons = container.querySelectorAll('button.maytes-checkout-button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Pay with Maytes');
  });

  it('calls onFailed only for its own provider', async () => {
    const onFailedA = vi.fn();
    const onFailedB = vi.fn();
    const { getAllByRole } = render(
      <>
        <MaytesProvider environment="sandbox" createCheckout={failing}><MaytesButton mode="redirect" onFailed={onFailedA} /></MaytesProvider>
        <MaytesProvider environment="sandbox" createCheckout={failing}><MaytesButton mode="redirect" onFailed={onFailedB} /></MaytesProvider>
      </>,
    );
    await act(async () => { getAllByRole('button')[0]!.click(); });
    await vi.waitFor(() => expect(onFailedA).toHaveBeenCalledOnce());
    expect(onFailedA).toHaveBeenCalledWith(expect.objectContaining({ reason: 'create-checkout-rejected' }));
    expect(onFailedB).not.toHaveBeenCalled();
  });

  it('forwards opened, closed and redirected for its own launches', async () => {
    const popup = makeFakePopup();
    window.open = vi.fn(() => popup as unknown as Window) as unknown as typeof window.open;
    const onOpened = vi.fn();
    const onClosed = vi.fn();
    const onRedirected = vi.fn();
    const { getByRole, rerender } = render(
      <MaytesProvider environment="sandbox" createCheckout={() => new Promise(() => undefined)}>
        <MaytesButton mode="popup" onOpened={onOpened} onClosed={onClosed} onRedirected={onRedirected} />
      </MaytesProvider>,
    );
    vi.useFakeTimers();
    try {
      act(() => { getByRole('button').click(); });
      expect(onOpened).toHaveBeenCalledOnce();
      popup.closed = true;
      act(() => { vi.advanceTimersByTime(550); });
      expect(onClosed).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }

    rerender(
      <MaytesProvider environment="sandbox" createCheckout={async () => ({ checkoutId: 'r-1' })}>
        <MaytesButton mode="redirect" onOpened={onOpened} onClosed={onClosed} onRedirected={onRedirected} />
      </MaytesProvider>,
    );
    await act(async () => { getByRole('button').click(); });
    await vi.waitFor(() => expect(onRedirected).toHaveBeenCalledOnce());
    expect(onRedirected).toHaveBeenCalledWith(expect.objectContaining({ target: 'self', url: 'https://sandbox-checkout.maytes.co/?id=r-1' }));
  });

  it('does not report launches started with useMaytes().openCheckout', async () => {
    const onFailed = vi.fn();
    let api!: ReturnType<typeof useMaytes>;
    function Own() {
      api = useMaytes();
      return null;
    }
    render(
      <MaytesProvider environment="sandbox" createCheckout={failing}>
        <MaytesButton onFailed={onFailed} />
        <Own />
      </MaytesProvider>,
    );
    await act(async () => { await api.openCheckout({ mode: 'redirect' }); });
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('removes the SDK button on unmount', () => {
    const { container, unmount } = render(
      <MaytesProvider environment="sandbox" createCheckout={failing}><MaytesButton /></MaytesProvider>,
    );
    expect(container.querySelector('button.maytes-checkout-button')).not.toBeNull();
    unmount();
    expect(document.querySelector('button.maytes-checkout-button')).toBeNull();
  });

  it('throws a clear error outside the provider', () => {
    expect(() => render(<MaytesButton />)).toThrow('<MaytesButton> must be used inside <MaytesProvider>.');
  });
});
