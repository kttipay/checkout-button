# Quickstart: npm with a bundler

Add the Split with Maytes button to a page built with Vite, webpack, esbuild or another bundler, without a UI framework.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The examples call it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

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

// When the checkout page goes away:
// removeButton();      removes just this button
// maytes.destroy();    tears down the instance, its buttons and any open popup
```

- TypeScript types ship with the package: `MaytesSDK`, `MaytesOptions`, `RenderButtonOptions`, the event detail types and more.
- Use `environment: 'sandbox'` with sandbox API credentials while you test, and `'production'` with production credentials when you go live.
- ESM (`import`) and CommonJS (`require`) builds ship unminified; your bundler minifies them.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
