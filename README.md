# @maytes/checkout-button

Drop-in **Split with Maytes** button. Renders a button and launches the Maytes-hosted checkout (popup on desktop, redirect on mobile) when clicked.

This repository is a **public release mirror**: it carries the changelog, tagged [GitHub Releases](../../releases), and the SRI-verified bundles published with each version. The source is developed in Maytes' private monorepo.

<!-- @latest-start -->

**Latest version:** _none published yet_

<!-- @latest-end -->

## Install

### Script tag (CDN)

```html
<script src="https://<cdn-host>/v1/checkout-button.js"
        integrity="sha384-…"
        crossorigin="anonymous"></script>
```

SRI hashes for each release are in [`CHANGELOG.md`](./CHANGELOG.md), on the matching [Release](../../releases), and at `/<cdn-host>/integrity.json`. Hashed filenames (e.g. `checkout-button.795d508b.js`) are immutable and safe to pin forever.

### npm

```bash
npm install @maytes/checkout-button
```

## Usage

`Maytes` is a callable factory (Stripe-style). Each call returns an isolated SDK instance.

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({
  createCheckout: async () => {
    const res = await fetch('/api/maytes/create-checkout', { method: 'POST' });
    return res.json(); // { checkoutId: string, checkoutUrl?: string }
  },
  environment: 'sandbox',
});

const cleanup = maytes.renderButton(document.getElementById('slot'), { block: true });

// Imperative alternatives:
maytes.redirectToCheckout({ checkoutId });
const url = maytes.checkoutUrl({ checkoutId });

// Teardown:
cleanup();
maytes.destroy();
```

Via the script tag, the same factory is available as the global `window.Maytes(...)`.

## API

| Method | Purpose |
|---|---|
| `Maytes(options)` | Create an SDK instance. `options.createCheckout` mints a checkout server-side; `options.environment` selects the Maytes environment. |
| `renderButton(container, options?)` | Render the button into `container`; returns a cleanup function. |
| `redirectToCheckout(options)` | Launch checkout directly (no button). |
| `checkoutUrl(options)` | Build the hosted checkout URL. |
| `destroy()` | Tear down the instance and its listeners. |

## Releases

See [`CHANGELOG.md`](./CHANGELOG.md) and [GitHub Releases](../../releases). Each release attaches the SRI-verified bundles (`checkout-button.js` / `.mjs` / `.cjs`, their immutable hashed filenames, and `integrity.json`).

## License

MIT
