// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MaytesButton, MaytesProvider } from '../react/index.js';

describe('server rendering', () => {
  it('imports and renders without window or document', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    const html = renderToString(
      <MaytesProvider environment="sandbox" createCheckout={async () => ({ checkoutId: 'x' })}>
        <MaytesButton block className="pay" />
      </MaytesProvider>,
    );
    expect(html).toBe('<div class="pay"></div>');
  });
});
