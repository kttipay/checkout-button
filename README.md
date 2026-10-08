<p align="center">
  <img src=".github/logo.svg" height="32" alt="Maytes">
</p>

<h1 align="center">@maytes/checkout-button</h1>

<p align="center">
  The <strong>Split with Maytes</strong> button for your checkout page.<br>
  Shoppers pay their share of the order and invite friends to pay theirs.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@maytes/checkout-button"><img alt="npm version" src="https://img.shields.io/npm/v/@maytes/checkout-button?color=4A0324&label=npm"></a>
  <a href="./CHANGELOG.md"><img alt="provenance" src="https://img.shields.io/badge/npm-provenance-4A0324"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-4A0324"></a>
  <a href="https://developers.maytes.co/checkout-button"><img alt="docs" src="https://img.shields.io/badge/docs-developers.maytes.co-FE572A"></a>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#choose-your-setup">Guides</a> ·
  <a href="#install">Install</a> ·
  <a href="#api">API</a> ·
  <a href="https://developers.maytes.co/checkout-button">Integration guide</a>
</p>

When a shopper clicks the button, it asks your server to create a Maytes checkout and opens it in a popup, or in the same tab on phones. Your server captures the payment when Maytes sends the `checkout.authorized` webhook.

## Features

- **Any stack.** A `<script>` tag or `import { Maytes }`, with [a guide per stack](#choose-your-setup), React components and a web component.
- **No dependencies.** ESM and CommonJS builds ship unminified, so your bundler tree-shakes them.
- **CSP-safe.** No `eval`, `Function` or string timers; every release is scanned.
- **Evergreen CDN.** `/v1/` always serves the newest `1.x`; [pin a version](#install) with SRI to freeze it.
- **Signed releases.** Every npm release carries [SLSA](https://slsa.dev) provenance.

## Quickstart

```html
<div id="maytes-button"></div>

<script src="https://js.maytes.co/v1/checkout-button.js" crossorigin="anonymous"></script>
<script>
  const maytes = window.Maytes({
    environment: 'sandbox',
    createCheckout: async () => {
      const res = await fetch('/api/maytes/checkout', { method: 'POST' });
      if (!res.ok) throw new Error('Could not create the Maytes checkout');
      return res.json(); // { checkoutId, checkoutUrl }
    },
  });

  maytes.renderButton(document.getElementById('maytes-button'), { block: true });
</script>
```

Your server creates the checkout behind `POST /api/maytes/checkout`; [Your server](docs/guides/server.md) shows how. Using a framework? Pick it below.

<a id="usage"></a>

## Choose your setup

<table>
  <tr>
    <td align="center" valign="top"><a href="docs/guides/quickstart-html.md"><img src="docs/assets/stacks/html.svg" width="44" height="44" alt=""><br><b>Plain HTML</b></a><br><sub>PHP, Rails, Django, Laravel, WordPress, …</sub></td>
    <td align="center" valign="top"><a href="docs/guides/quickstart-npm.md"><img src="docs/assets/stacks/npm.svg" width="44" height="44" alt=""><br><b>npm + bundler</b></a><br><sub>Vite, webpack, esbuild, no framework</sub></td>
    <td align="center" valign="top"><a href="docs/guides/react.md"><img src="docs/assets/stacks/react.svg" width="44" height="44" alt=""><br><b>React</b></a><br><sub>Vite, CRA, Remix · <code>/react</code> components</sub></td>
    <td align="center" valign="top"><a href="docs/guides/nextjs.md"><img src="docs/assets/stacks/next.svg" width="44" height="44" alt=""><br><b>Next.js</b></a><br><sub>App Router client component</sub></td>
  </tr>
  <tr>
    <td align="center" valign="top"><a href="docs/guides/vue-nuxt.md"><img src="docs/assets/stacks/vue.svg" width="44" height="44" alt=""><br><b>Vue 3 · Nuxt 3</b></a></td>
    <td align="center" valign="top"><a href="docs/guides/angular.md"><img src="docs/assets/stacks/angular.svg" width="44" height="44" alt=""><br><b>Angular</b></a></td>
    <td align="center" valign="top"><a href="docs/guides/svelte.md"><img src="docs/assets/stacks/svelte.svg" width="44" height="44" alt=""><br><b>Svelte · SvelteKit</b></a></td>
    <td align="center" valign="top"><a href="docs/guides/solid.md"><img src="docs/assets/stacks/solid.svg" width="44" height="44" alt=""><br><b>Solid · SolidStart</b></a></td>
  </tr>
  <tr>
    <td align="center" valign="top"><a href="docs/guides/web-component.md"><img src="docs/assets/stacks/element.svg" width="44" height="44" alt=""><br><b>Web component</b></a><br><sub><code>&lt;maytes-checkout-button&gt;</code> for any framework</sub></td>
    <td align="center" valign="top"><a href="docs/guides/stripe-payment-element.md"><img src="docs/assets/stacks/stripe.svg" width="44" height="44" alt=""><br><b>Stripe Payment Element</b></a></td>
    <td align="center" valign="top"><a href="docs/guides/own-button.md"><img src="docs/assets/stacks/own-button.svg" width="44" height="44" alt=""><br><b>Your own button</b></a><br><sub>A Pay button, an express-checkout row, …</sub></td>
    <td align="center" valign="top"><a href="docs/guides/server.md"><img src="docs/assets/stacks/server.svg" width="44" height="44" alt=""><br><b>Your server</b></a><br><sub>Your backend, in any language</sub></td>
  </tr>
</table>

Every guide is self-contained: the install step, a copy-paste example and what to read next.

## Install

| | Evergreen (recommended) | Pinned |
|---|---|---|
| **Use when** | Default — always get the newest `1.x` release | You'd rather freeze on a tested build |
| **Guarantee** | Always current; a bad release reaches you immediately | The bytes you tested are the bytes shipped, forever |
| **SRI** | Not possible | Yes |

```html
<script src="https://js.maytes.co/v1/checkout-button.js"
        crossorigin="anonymous"></script>
```

<details>
<summary><b>Evergreen: CSP and versions</b></summary>

No `integrity` attribute is possible here — the bytes change without notice as new `1.x` releases ship. Trust the origin via CSP instead:

```
Content-Security-Policy: script-src 'self' https://js.maytes.co;
```

`/v1/` tracks the newest `1.x` release only; it won't jump to a future `2.x` (move to `/v2/checkout-button.js` explicitly once that ships). Poll `https://js.maytes.co/integrity.json` if you want to detect changes yourself.

</details>

<details>
<summary><b>Pinned: SemVer or content hash, with SRI</b></summary>

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

</details>

**npm**

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
| `renderButton(container, { label, block, mode, radius, height })` | Renders the button and returns a function that removes it. `mode` is `'popup'` (default) or `'redirect'`; `radius` and `height` fit it next to wallet buttons. |
| `openCheckout({ mode })` | Starts the checkout from your own button, as a click on the rendered button does. See [Using your own button](docs/guides/own-button.md). |
| `instanceId` | Read-only id of the instance; every `maytes:checkout-*` event carries it in `event.detail`. |
| `onBusyChange(listener)` | Calls `listener(true)` when a launch starts and `listener(false)` when it ends; returns a function that stops listening. |
| `redirectToCheckout({ checkoutId, replace })` | Sends the current tab to a checkout you already created. |
| `checkoutUrl({ checkoutId })` | Builds the hosted checkout URL. |
| `destroy()` | Tears down the instance, its buttons, listeners and overlay. Call it on unmount. |
| `maytes:checkout-opened` / `-closed` / `-redirected` / `-failed` | `CustomEvent`s on `document` describing what the button did. |

Style the button from CSS with `--maytes-button-height`, `--maytes-button-radius` and `--maytes-button-font-size`; see the [API reference](docs/guides/api.md#styling-with-css-custom-properties).

Full reference: [API](docs/guides/api.md) · [Events](docs/guides/events.md).

## All guides

| | |
|---|---|
| 🚀 **Get started** | [plain HTML](docs/guides/quickstart-html.md) · [npm with a bundler](docs/guides/quickstart-npm.md) · [React](docs/guides/react.md) · [Next.js](docs/guides/nextjs.md) · [Vue 3 and Nuxt 3](docs/guides/vue-nuxt.md) · [Angular](docs/guides/angular.md) · [Svelte and SvelteKit](docs/guides/svelte.md) · [Solid](docs/guides/solid.md) · [Web component](docs/guides/web-component.md) |
| 💳 **Server and payments** | [Your server](docs/guides/server.md) · [With Stripe's Payment Element](docs/guides/stripe-payment-element.md) · [Using your own button](docs/guides/own-button.md) |
| 📚 **Reference** | [API](docs/guides/api.md) · [Events](docs/guides/events.md) · [Popup, redirect and iframes](docs/guides/launch-behaviour.md) · [Security and CSP](docs/guides/security-csp.md) |
| 🛟 **Help** | [Troubleshooting](docs/guides/troubleshooting.md) |
| 🔧 **Internals** | [Technical overview](docs/overview.md) · [CDN versioning decision record](docs/cdn-versioning.md) |

The same guides ship in the npm package under `docs/guides/` and are published on [developers.maytes.co](https://developers.maytes.co/checkout-button).

## Using an AI coding assistant

🤖 This repository ships an [Agent Skill](https://github.com/kttipay/maytes-checkout-button/tree/main/skills/maytes-checkout-button) that teaches coding assistants to add Split with Maytes correctly on any stack: credentials stay on your server, `createCheckout` returns `{ checkoutId, checkoutUrl }`, the button is created in browser-only code and destroyed on unmount, and the webhook captures the payment.

In Claude Code:

```
/plugin marketplace add kttipay/maytes-checkout-button
/plugin install maytes-checkout-button@maytes
```

Then ask, for example, "add Split with Maytes to my checkout". Other assistants that support Agent Skills can use the [`skills/maytes-checkout-button`](https://github.com/kttipay/maytes-checkout-button/tree/main/skills/maytes-checkout-button) folder directly. The skill covers only the released API.

## Mobile app

After checkout, shoppers split the cost with friends using Maytes payment links (`app.maytes.co/…`). With the Maytes app installed, those links open in the app (iOS Universal Links / Android App Links); otherwise in the browser. Maytes handles this end to end — you integrate only the button and configure nothing for the app.

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
