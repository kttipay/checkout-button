<p align="center">
  <img src=".github/logo.svg" height="32" alt="Maytes">
</p>

<h1 align="center">@maytes/checkout-button</h1>

<p align="center">
  Drop-in <strong>Split with Maytes</strong> button — one script or import, and shoppers can split any checkout with friends.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@maytes/checkout-button"><img alt="npm version" src="https://img.shields.io/npm/v/@maytes/checkout-button?color=4A0324&label=npm"></a>
  <a href="https://bundlephobia.com/package/@maytes/checkout-button"><img alt="bundle size" src="https://img.shields.io/bundlephobia/minzip/@maytes/checkout-button?color=FE572A&label=gzip"></a>
  <a href="./CHANGELOG.md"><img alt="provenance" src="https://img.shields.io/badge/npm-provenance-4A0324"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-4A0324"></a>
  <a href="https://developers.maytes.co/checkout-button"><img alt="docs" src="https://img.shields.io/badge/docs-developers.maytes.co-FE572A"></a>
</p>

---

The button sits on your checkout page. When a shopper clicks it, it asks your server for a Maytes checkout and opens the Maytes-hosted checkout, where the shopper pays their share and invites friends to pay theirs. It works with any stack: a `<script>` tag or an npm import, with or without a framework.

**📖 Full integration guide:** [developers.maytes.co/checkout-button](https://developers.maytes.co/checkout-button)

- **Any stack** — the same `Maytes()` factory from a `<script>` tag or `import { Maytes }`; [a guide per stack](#choose-your-setup) for plain HTML, bundlers, React, Next.js, Vue, Nuxt, Angular, Svelte and Solid.
- **Zero runtime dependencies** — a small, dependency-free bundle; ESM/CJS ship unminified so your bundler can tree-shake it.
- **CSP-safe by construction** — no `eval`, `Function`, or string-form timers; every release is scanned for it before shipping.
- **Evergreen CDN by default** — the recommended `<script>` tag always serves the newest `1.x` release; pin a version with SRI if you'd rather freeze on a tested build.
- **Signed provenance** — every npm release carries a [SLSA](https://slsa.dev) provenance attestation back to this repo's build.

## Contents

- [How it works](#how-it-works)
- [Choose your setup](#choose-your-setup)
- [Install](#install)
- [API](#api)
- [All guides](#all-guides)
- [Using an AI coding assistant](#using-an-ai-coding-assistant)
- [Mobile app](#mobile-app)
- [Development](#development)

## How it works

1. **The shopper clicks "Split with Maytes".** The button calls the `createCheckout` function you pass to `Maytes()`.
2. **Your server creates the checkout.** Your `createCheckout` calls your own endpoint, which creates a Maytes checkout with your API credentials and returns `{ checkoutId, checkoutUrl }`. Credentials never reach the browser.
3. **The button opens the Maytes checkout.** On desktop it opens a popup with a Maytes loading screen while step 2 runs. On phones, when the popup is blocked, or with `mode: 'redirect'`, it opens in the same tab.
4. **Your server takes the money.** When the shopper has paid, Maytes sends the `checkout.authorized` webhook; your server captures the checkout within 2 minutes. A successful capture is your "order paid" signal.
5. **The shopper comes back** to the `return_url` you set when creating the checkout. In popup mode the checkout sends your page there and closes the popup.

The button handles steps 1 and 3. Steps 2 and 4 are your server: see [Your server](docs/guides/server.md).

<a id="usage"></a>

## Choose your setup

| Your checkout page is built with | Guide |
|---|---|
| Server-rendered HTML (PHP, Rails, Django, Laravel, WordPress, …) or any page without a bundler | [Quickstart: plain HTML](docs/guides/quickstart-html.md) |
| Vite, webpack, esbuild or another bundler, no UI framework | [Quickstart: npm with a bundler](docs/guides/quickstart-npm.md) |
| React (Vite, Create React App, Remix) | [React](docs/guides/react.md) |
| Next.js | [Next.js](docs/guides/nextjs.md) |
| Vue 3 or Nuxt 3 | [Vue 3 and Nuxt 3](docs/guides/vue-nuxt.md) |
| Angular | [Angular](docs/guides/angular.md) |
| Svelte or SvelteKit | [Svelte and SvelteKit](docs/guides/svelte.md) |
| Solid or SolidStart | [Solid](docs/guides/solid.md) |
| Stripe's Payment Element | [With Stripe's Payment Element](docs/guides/stripe-payment-element.md) |
| Your own Pay button (Stripe, an express-checkout row, …) | [Using your own button](docs/guides/own-button.md) |
| Your backend, in any language | [Your server](docs/guides/server.md) |

Every guide is self-contained: the install step, a copy-paste example and what to read next.

## Install

### Script tag (CDN)

|  | Evergreen (recommended) | Pinned |
|---|---|---|
| **Use when** | Default — always get the newest `1.x` release | You'd rather freeze on a tested build |
| **Guarantee** | Always current; a bad release reaches you immediately | The bytes you tested are the bytes shipped, forever |
| **SRI** | Not possible | Yes |

### Evergreen (recommended)

```html
<script src="https://js.maytes.co/v1/checkout-button.js"
        crossorigin="anonymous"></script>
```

No `integrity` attribute is possible here — the bytes change without notice as new `1.x` releases ship. Trust the origin via CSP instead:

```
Content-Security-Policy: script-src 'self' https://js.maytes.co;
```

`/v1/` tracks the newest `1.x` release only; it won't jump to a future `2.x` (move to `/v2/checkout-button.js` explicitly once that ships). Poll `https://js.maytes.co/integrity.json` if you want to detect changes yourself.

### Pinned (SemVer or content hash)

For a guarantee instead of convenience — freeze on a tested build, update on your own schedule:

<!-- @cdn-example-start -->
```html
<script src="https://js.maytes.co/v1.1.1/checkout-button.js"
        integrity="sha384-…"
        crossorigin="anonymous"></script>
```

```html
<script src="https://js.maytes.co/checkout-button.4b780d52.js"
        integrity="sha384-…"
        crossorigin="anonymous"></script>
```
<!-- @cdn-example-end -->

Both URLs are the same release bytes with the same SRI value — pick either. Full version/hash/SRI history: [`CHANGELOG.md`](./CHANGELOG.md), [releases](https://github.com/kttipay/maytes-checkout-button/releases), `https://js.maytes.co/integrity.json`. Pinned URLs never change once published.

### npm

```bash
npm install @maytes/checkout-button
```

ESM (`import`) and CommonJS (`require`) builds ship unminified with type declarations; your bundler minifies them. The reasoning behind the CDN channels is in [`docs/cdn-versioning.md`](./docs/cdn-versioning.md).

## API

`Maytes` is a callable factory, like `Stripe()`. Each call returns an isolated instance.

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

maytes.renderButton(document.getElementById('maytes-button')!, { block: true });
```

| Member | Purpose |
|---|---|
| `Maytes({ createCheckout, environment })` | Creates an instance. `createCheckout` asks your server for `{ checkoutId, checkoutUrl? }`; `environment` is `'sandbox'` or `'production'`. |
| `renderButton(container, { label, block, mode })` | Renders the button and returns a function that removes it. `mode` is `'popup'` (default) or `'redirect'`. |
| `openCheckout({ mode })` | Starts the checkout from your own button, as a click on the rendered button does. See [Using your own button](docs/guides/own-button.md). |
| `redirectToCheckout({ checkoutId, replace })` | Sends the current tab to a checkout you already created. |
| `checkoutUrl({ checkoutId })` | Builds the hosted checkout URL. |
| `destroy()` | Tears down the instance, its buttons, listeners and overlay. Call it on unmount. |
| `maytes:checkout-opened` / `-closed` / `-redirected` / `-failed` | `CustomEvent`s on `document` describing what the button did. |

Full reference: [API](docs/guides/api.md) · [Events](docs/guides/events.md).

## All guides

- **Get started:** [plain HTML](docs/guides/quickstart-html.md) · [npm with a bundler](docs/guides/quickstart-npm.md) · [React](docs/guides/react.md) · [Next.js](docs/guides/nextjs.md) · [Vue 3 and Nuxt 3](docs/guides/vue-nuxt.md) · [Angular](docs/guides/angular.md) · [Svelte and SvelteKit](docs/guides/svelte.md) · [Solid](docs/guides/solid.md)
- **Server and payments:** [Your server](docs/guides/server.md) · [With Stripe's Payment Element](docs/guides/stripe-payment-element.md) · [Using your own button](docs/guides/own-button.md)
- **Reference:** [API](docs/guides/api.md) · [Events](docs/guides/events.md) · [Popup, redirect and iframes](docs/guides/launch-behaviour.md) · [Security and CSP](docs/guides/security-csp.md)
- **Help:** [Troubleshooting](docs/guides/troubleshooting.md)
- **Internals:** [Technical overview](docs/overview.md) · [CDN versioning decision record](docs/cdn-versioning.md)

The same guides ship in the npm package under `docs/guides/` and are published on [developers.maytes.co](https://developers.maytes.co/checkout-button).

## Using an AI coding assistant

This repository ships an [Agent Skill](https://github.com/kttipay/maytes-checkout-button/tree/main/skills/maytes-checkout-button) that teaches coding assistants to add Split with Maytes correctly on any stack: credentials stay on your server, `createCheckout` returns `{ checkoutId, checkoutUrl }`, the button is created in browser-only code and destroyed on unmount, and the webhook captures the payment.

In Claude Code:

```
/plugin marketplace add kttipay/maytes-checkout-button
/plugin install maytes-checkout-button@maytes
```

Then ask, for example, "add Split with Maytes to my checkout". Other assistants that support Agent Skills can use the [`skills/maytes-checkout-button`](https://github.com/kttipay/maytes-checkout-button/tree/main/skills/maytes-checkout-button) folder directly. The skill covers only the released API.

## Mobile app

After checkout, shoppers split the cost with friends using Maytes payment links (`app.maytes.co/…`). On a phone with the Maytes app installed, those links open directly in the app (iOS Universal Links / Android App Links); otherwise they open in the browser. Maytes handles this end to end — merchants integrate only the button and configure nothing for the app.

## Development

```bash
npm ci
npm run dev          # tsup watch
npm run typecheck
npm run test:run
npm run build        # bundles + SRI hashes + CSP scan
```

Versioning and changelog are managed with [Changesets](./.changeset/README.md). Run `npm run changeset` with your PR. Brand colours are vendored, not hand-written — see [`RELEASING.md`](./RELEASING.md#brand-colours-come-from-the-design-foundation) for how that works. Internals, the end-to-end sequence and behaviour contracts are in [`docs/overview.md`](./docs/overview.md).

## License

[MIT](./LICENSE)
