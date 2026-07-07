# @maytes/checkout-button

Drop-in **Split with Maytes** button. Add one `<script>` and a button renders that launches the Maytes-hosted checkout when clicked. It redirects in the same window by default; `mode: 'popup'` opts desktop browsers into a centered popup, with automatic redirect fallback on mobile or when the popup is blocked.

> **This is the public release mirror.** It carries the changelog, tagged [GitHub Releases](https://github.com/kttipay/checkout-button/releases), and the SRI-verified bundles for each version. The SDK source is developed in Maytes' private monorepo; only releases are mirrored here.

<!-- @latest-start -->

**Latest version:** _none published yet_

<!-- @latest-end -->

## Install

### Script tag (CDN, production)

Pin production to an exact release. The readable SemVer URL and the content-hash URL are two names for the **same release bytes** and share the **same SRI value** — pick either (`v0.1.0` / `795d508b` below are examples):

```html
<script src="https://js.maytes.co/v0.1.0/checkout-button.js"
        integrity="sha384-…"
        crossorigin="anonymous"></script>
```

```html
<script src="https://js.maytes.co/checkout-button.795d508b.js"
        integrity="sha384-…"
        crossorigin="anonymous"></script>
```

Copy the `integrity` value for your version from the matching [Release](https://github.com/kttipay/checkout-button/releases) or [`CHANGELOG.md`](./CHANGELOG.md).

### npm

```bash
npm install @maytes/checkout-button
```

## Usage

`Maytes` is a callable factory (Stripe-style); each call returns an isolated instance.

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({
  createCheckout: async () => {
    const res = await fetch('/api/maytes/create-checkout', { method: 'POST' });
    return res.json(); // { checkoutId: string, checkoutUrl?: string }
  },
  environment: 'sandbox', // or 'production'
});

const cleanup = maytes.renderButton(document.getElementById('slot'), { block: true });

// Optional popup mode (desktop; auto-falls back to redirect on mobile or when blocked):
maytes.renderButton(document.getElementById('popup-slot'), { block: true, mode: 'popup' });

// Imperative alternatives:
maytes.redirectToCheckout({ checkoutId });
const url = maytes.checkoutUrl({ checkoutId });

// Teardown:
cleanup();
maytes.destroy();
```

Via the script tag the same factory is the global `window.Maytes(...)`.

## API

| Method | Purpose |
|---|---|
| `Maytes(options)` | Create an SDK instance. `options.createCheckout` mints a checkout server-side; `options.environment` is `'sandbox'` or `'production'`. |
| `renderButton(container, options?)` | Render the button into `container`; returns a cleanup function. Options include `label`, `block`, and `mode: 'redirect' \| 'popup'`. |
| `redirectToCheckout(options)` | Launch checkout directly (no button). |
| `checkoutUrl(options)` | Build the hosted checkout URL. |
| `destroy()` | Tear down the instance and its listeners. |

## Mobile app

After checkout, shoppers split the cost with friends using Maytes payment links (`app.maytes.co/…`). On a phone with the Maytes app installed, those links open directly in the app (iOS Universal Links / Android App Links); otherwise they open in the browser. Maytes handles this end to end — merchants integrate only the button and configure nothing for the app.

## Releases & integrity

Every [Release](https://github.com/kttipay/checkout-button/releases) attaches:

- `checkout-button.js` / `.mjs` / `.cjs` — IIFE / ESM / CJS bundles
- readable immutable SemVer CDN links (e.g. `https://js.maytes.co/v0.1.0/checkout-button.js`)
- immutable hashed CDN links (e.g. `https://js.maytes.co/checkout-button.795d508b.js`)
- `integrity.json` — version, SHA-256, and SRI (`sha384-…`) for every bundle

To confirm a bundle you fetched matches a release:

```bash
curl -s https://js.maytes.co/v0.1.0/checkout-button.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
# compare the output against the sri value in CHANGELOG.md / integrity.json
```

The full version history with SRI hashes lives in [`CHANGELOG.md`](./CHANGELOG.md).

## License

[MIT](./LICENSE)
