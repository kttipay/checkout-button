# npm with a bundler

For Vite, webpack, esbuild or another bundler without a UI framework.

```bash
npm install @maytes/checkout-button
```

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({
  environment: 'sandbox',
  createCheckout: async () => {
    const res = await fetch('/api/maytes/checkout', { method: 'POST' });
    if (!res.ok) throw new Error('Could not create the Maytes checkout');
    return res.json(); // { checkoutId, checkoutUrl }
  },
});

const removeButton = maytes.renderButton(document.getElementById('maytes-button')!, { block: true });

// When the page goes away: removeButton() for one button, maytes.destroy() for everything.
```

Types ship with the package (`MaytesSDK`, `MaytesOptions`, `RenderButtonOptions`, `CheckoutFailedDetail`, `CheckoutRedirectedDetail`).
