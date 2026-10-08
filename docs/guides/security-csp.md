# Security and CSP

Where credentials live, and how to run the button under a strict Content Security Policy.

- **Keep credentials on your server.** The browser only ever sees `checkoutId` and `checkoutUrl`. Treat `checkoutId` like a magic link: it identifies the shopper's checkout session.
- **Price on the server.** Send a cart or order reference from the browser and price it from your own catalogue; never trust a browser-supplied total.

## Scripts

Allow the CDN:

```
Content-Security-Policy: script-src 'self' https://js.maytes.co;
```

With a pinned URL you can also add an `integrity` attribute (SRI); the evergreen `/v1/` URL can't have one because its bytes change with each `1.x` release. Pinned URLs and their SRI hashes are in [Install and versioning](https://github.com/kttipay/maytes-checkout-button#install) and the [CHANGELOG](https://github.com/kttipay/maytes-checkout-button/blob/main/CHANGELOG.md).

## Styles

The button injects a `<style>` tag. On a strict `style-src` policy, pass your nonce as the second argument so it's set on every style tag the SDK adds, including the popup's loading screen and the page overlay:

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({ createCheckout, environment: 'production' }, { cspNonce: 'your-nonce' });
```

## No eval

The bundle uses no `eval`, `Function` or string-form timers, and every release is scanned for them, so `'unsafe-eval'` is never needed.

Next: [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
