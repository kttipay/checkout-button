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

- **Any stack** — the same `Maytes()` factory from a `<script>` tag or `import { Maytes }`; copy-paste quickstarts below for plain HTML, bundlers, React, Next.js and Vue.
- **Zero runtime dependencies** — a small, dependency-free bundle; ESM/CJS ship unminified so your bundler can tree-shake it.
- **CSP-safe by construction** — no `eval`, `Function`, or string-form timers; every release is scanned for it before shipping.
- **Evergreen CDN by default** — the recommended `<script>` tag always serves the newest `1.x` release; pin a version with SRI if you'd rather freeze on a tested build.
- **Signed provenance** — every npm release carries a [SLSA](https://slsa.dev) provenance attestation back to this repo's build.

## Contents

- [How it works](#how-it-works)
- [Choose your setup](#choose-your-setup)
- [Quickstarts](#quickstarts)
  - [Plain HTML (script tag)](#plain-html-script-tag)
  - [npm with a bundler](#npm-with-a-bundler)
  - [React](#react)
  - [Next.js](#nextjs)
  - [Vue 3](#vue-3)
  - [Nuxt 3](#nuxt-3)
  - [Angular](#angular)
  - [Svelte and SvelteKit](#svelte-and-sveltekit)
  - [Solid](#solid)
  - [Your server](#your-server)
- [API](#api)
- [Events](#events)
- [Popup, redirect and iframes](#popup-redirect-and-iframes)
- [With Stripe's Payment Element](#with-stripes-payment-element)
- [Security and CSP](#security-and-csp)
- [Install and versioning](#install)
- [Mobile app](#mobile-app)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## How it works

1. **The shopper clicks "Split with Maytes".** The button calls the `createCheckout` function you pass to `Maytes()`.
2. **Your server creates the checkout.** Your `createCheckout` calls your own endpoint, which creates a Maytes checkout with your API credentials and returns `{ checkoutId, checkoutUrl }`. Credentials never reach the browser.
3. **The button opens the Maytes checkout.** On desktop it opens a popup with a Maytes loading screen while step 2 runs. On phones, when the popup is blocked, or with `mode: 'redirect'`, it opens in the same tab.
4. **Your server takes the money.** When the shopper has paid, Maytes sends the `checkout.authorized` webhook; your server captures the checkout within 2 minutes. A successful capture is your "order paid" signal.
5. **The shopper comes back** to the `return_url` you set when creating the checkout. In popup mode the checkout sends your page there and closes the popup.

The button handles steps 1 and 3. Steps 2 and 4 are your server — see [Your server](#your-server).

## Choose your setup

| Your checkout page is built with | Start here |
|---|---|
| Server-rendered HTML (PHP, Rails, Django, Laravel, WordPress, …) or any page without a bundler | [Plain HTML (script tag)](#plain-html-script-tag) |
| Vite, webpack, esbuild or another bundler, no UI framework | [npm with a bundler](#npm-with-a-bundler) |
| React (Vite, Create React App, Remix) | [React](#react) |
| Next.js | [Next.js](#nextjs) |
| Vue 3 | [Vue 3](#vue-3) |
| Nuxt 3 | [Nuxt 3](#nuxt-3) |
| Angular | [Angular](#angular) |
| Svelte or SvelteKit | [Svelte and SvelteKit](#svelte-and-sveltekit) |
| Solid or SolidStart | [Solid](#solid) |
| Stripe's Payment Element | [With Stripe's Payment Element](#with-stripes-payment-element) |
| Your backend, in any language | [Your server](#your-server) |

<a id="usage"></a>

## Quickstarts

Every quickstart assumes your server exposes `POST /api/maytes/checkout`, which creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. [Your server](#your-server) shows how to build it. Use `environment: 'sandbox'` with sandbox API credentials while you test, and `'production'` with production credentials when you go live.

### Plain HTML (script tag)

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

The second script must run after the first, so keep them in this order (both without `async`). The CDN options, including pinned versions with SRI, are under [Install and versioning](#install).

### npm with a bundler

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

TypeScript types ship with the package (`MaytesSDK`, `MaytesOptions`, `RenderButtonOptions`, the event detail types and more).

### React

Create the instance once per mount, read the latest cart through a ref, and destroy it on unmount. This is safe under React's StrictMode, which mounts effects twice in development.

```tsx
import { useEffect, useRef } from 'react';
import { Maytes } from '@maytes/checkout-button';

export function SplitWithMaytesButton({ cartId }: { cartId: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const cartIdRef = useRef(cartId);

  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  useEffect(() => {
    const maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: cartIdRef.current }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slotRef.current!, { block: true });
    return () => maytes.destroy();
  }, []);

  return <div ref={slotRef} />;
}
```

- `createCheckout` runs on click, so it reads `cartIdRef.current` rather than closing over the first render's `cartId`. The button is not rebuilt when the cart changes.
- To react to the checkout (for example to show your own message when it fails), add a [`maytes:checkout-*` event](#events) listener in another `useEffect` and remove it in the cleanup.

### Next.js

Use a client component. The package doesn't touch `window` when it's imported, so it is safe in server-rendered pages; the button is created in `useEffect`, which only runs in the browser.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Maytes } from '@maytes/checkout-button';

export default function SplitWithMaytesButton({ cartId }: { cartId: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const cartIdRef = useRef(cartId);

  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  useEffect(() => {
    const maytes = Maytes({
      environment: process.env.NEXT_PUBLIC_MAYTES_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: cartIdRef.current }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slotRef.current!, { block: true });
    return () => maytes.destroy();
  }, []);

  return <div ref={slotRef} />;
}
```

Put the server half in a Route Handler (`app/api/maytes/checkout/route.ts`) so your Maytes credentials stay on the server; [Your server](#your-server) has the code. Prefer the CDN? Load it with `next/script` (`<Script src="https://js.maytes.co/v1/checkout-button.js" strategy="afterInteractive" onReady={…} />`) and call `window.Maytes(…)` in `onReady` instead of importing.

### Vue 3

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Maytes, type MaytesSDK } from '@maytes/checkout-button';

const props = defineProps<{ cartId: string }>();
const slot = ref<HTMLDivElement | null>(null);
let maytes: MaytesSDK | null = null;

onMounted(() => {
  maytes = Maytes({
    environment: 'sandbox',
    createCheckout: async () => {
      const res = await fetch('/api/maytes/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cartId: props.cartId }),
      });
      if (!res.ok) throw new Error('Could not create the Maytes checkout');
      return res.json(); // { checkoutId, checkoutUrl }
    },
  });
  maytes.renderButton(slot.value!, { block: true });
});

onBeforeUnmount(() => maytes?.destroy());
</script>

<template>
  <div ref="slot" />
</template>
```

`props.cartId` is read when the shopper clicks, so it is always the latest value.

### Nuxt 3

Use the [Vue 3](#vue-3) component as it is. `onMounted` only runs in the browser and the package doesn't touch `window` when it's imported, so server rendering is safe. Save it as `components/SplitWithMaytesButton.client.vue` (the `.client` suffix renders it only in the browser), or wrap it in `<ClientOnly>`:

```vue
<template>
  <ClientOnly>
    <SplitWithMaytesButton :cart-id="cart.id" />
  </ClientOnly>
</template>
```

Put the server half in a server route such as `server/api/maytes/checkout.post.ts`; [Your server](#your-server) shows what it must return.

### Angular

```ts
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Maytes, type MaytesSDK } from '@maytes/checkout-button';

@Component({
  selector: 'app-split-with-maytes',
  standalone: true,
  template: '<div #slot></div>',
})
export class SplitWithMaytesComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) cartId!: string;
  @ViewChild('slot', { static: true }) slot!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private maytes: MaytesSDK | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: this.cartId }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    this.maytes.renderButton(this.slot.nativeElement, { block: true });
  }

  ngOnDestroy(): void {
    this.maytes?.destroy();
  }
}
```

The `isPlatformBrowser` check keeps the button out of Angular's server-side rendering; without SSR it is always true. `this.cartId` is read when the shopper clicks.

### Svelte and SvelteKit

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Maytes } from '@maytes/checkout-button';

  let { cartId }: { cartId: string } = $props();
  let slot: HTMLDivElement;

  onMount(() => {
    const maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slot, { block: true });
    return () => maytes.destroy();
  });
</script>

<div bind:this={slot}></div>
```

This is Svelte 5; on Svelte 4 replace the `$props()` line with `export let cartId: string;`. `onMount` only runs in the browser, so it works in SvelteKit pages as they are. Put the server half in `src/routes/api/maytes/checkout/+server.ts`.

### Solid

```tsx
import { onCleanup, onMount } from 'solid-js';
import { Maytes } from '@maytes/checkout-button';

export function SplitWithMaytesButton(props: { cartId: string }) {
  let slot!: HTMLDivElement;

  onMount(() => {
    const maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: props.cartId }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slot, { block: true });
    onCleanup(() => maytes.destroy());
  });

  return <div ref={slot} />;
}
```

`onMount` only runs in the browser, so this also works with SolidStart's server rendering. `props.cartId` is read when the shopper clicks.

### Your server

Your endpoint creates the checkout with the [Maytes merchant API](https://developers.maytes.co/create-checkout) and returns two fields to the browser:

```json
{ "checkoutId": "019fbb9e-ecd1-7059-99f3-f8bf47b63931", "checkoutUrl": "https://sandbox-checkout.maytes.co/?id=019fbb9e-ecd1-7059-99f3-f8bf47b63931" }
```

- `checkoutId` is required. `checkoutUrl` is optional, but return it: the button then opens exactly the URL Maytes gave you.
- The merchant API answers in snake_case (`checkout_uuid`, `checkout_url`). Map them to `checkoutId` and `checkoutUrl`; anything else makes the button report `invalid-shape`.
- Price the cart on your server. Send a cart or order reference from the browser, never a total.

Node.js with Express and the Maytes backend SDK (`npm install @maytes/api-client-js`; SDKs for Python, PHP, Go, Java, Ruby and .NET are on [developers.maytes.co](https://developers.maytes.co/build-your-integration)):

```ts
import express from 'express';
import { createMaytesApiClient } from '@maytes/api-client-js';

const maytesApi = createMaytesApiClient({
  endpoint: 'https://sandbox-api.maytes.co',   // https://api.maytes.co in production
  clientId: process.env.MAYTES_CLIENT_ID!,
  clientSecret: process.env.MAYTES_CLIENT_SECRET!,
});

const app = express();
app.use(express.json());

app.post('/api/maytes/checkout', async (req, res) => {
  const cart = await loadCart(req.body.cartId);                // your catalogue, your prices
  const merchantOrderId = await createPendingOrder(cart);

  const created = await maytesApi.createCheckout({
    createCheckoutRequest: {
      merchantOrderId,
      totalAmount: cart.total,                                 // minor units: 4500 = AUD 45.00
      currency: 'AUD',
      returnUrl: `https://shop.example.com/thanks?order=${merchantOrderId}`,
      cancelUrl: 'https://shop.example.com/cart',
      items: cart.lines.map((line) => ({
        itemRef: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        currency: 'AUD',
        category: 'other',
      })),
    },
  });

  await saveCheckoutId(merchantOrderId, created.data.checkoutUuid);
  res.json({ checkoutId: created.data.checkoutUuid, checkoutUrl: created.data.checkoutUrl });
});
```

Then finish the server side on developers.maytes.co:

- [Webhooks](https://developers.maytes.co/webhooks): subscribe to `checkout.authorized` and verify the `X-Maytes-Signature` header.
- [Capture and checkout status](https://developers.maytes.co/capture-and-status): capture within 2 minutes of `checkout.authorized`, or the hold is voided.
- Match environments: sandbox credentials only work against `https://sandbox-api.maytes.co`, and the browser's `environment` should be `'sandbox'` while you use them.

## API

`Maytes` is a callable factory, like `Stripe()`. Each call returns an isolated instance. From the script tag it is `window.Maytes`; from npm it is `import { Maytes } from '@maytes/checkout-button'`.

### `Maytes(options)`

| Option | Type | Description |
|---|---|---|
| `createCheckout` | `() => Promise<{ checkoutId: string; checkoutUrl?: string }>` | Required. Called when the shopper clicks; asks your server for a checkout. Throw (or reject) to report a failure. |
| `environment` | `'sandbox' \| 'production'` | Required. Which Maytes environment the checkout opens in when you don't return `checkoutUrl`: `sandbox` → `https://sandbox-checkout.maytes.co`, `production` → `https://checkout.maytes.co`. |

Returns a `MaytesSDK` instance with the methods below. Invalid options throw `MaytesError` with `code: 'CONFIG'`.

### Instance methods

| Method | Returns | Description |
|---|---|---|
| `renderButton(container, options?)` | `() => void` | Renders the button into `container` (an `HTMLElement`) and returns a function that removes it. |
| `redirectToCheckout({ checkoutId, replace? })` | `void` | Sends the current tab to a checkout you already created, without a button. `replace: true` replaces the history entry. Inside an iframe it navigates the top-level window and throws `MaytesError` if the browser refuses. |
| `checkoutUrl({ checkoutId })` | `string` | Builds the hosted checkout URL for a checkout you already created. |
| `destroy()` | `void` | Tears down the instance: buttons, listeners, the overlay and a popup that hasn't loaded yet. Idempotent. |

Call `destroy()` when the page or component goes away, or when you need an instance with a different `environment`. Don't call it because your own code saw the payment succeed: that can tear down a checkout that's still in progress. To remove one button, call the function `renderButton()` returned.

### `renderButton` options

| Option | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Split with'` | Text before the Maytes logo. The accessible name is `"<label> Maytes"`. |
| `block` | `boolean` | `false` | `true` makes the button fill the width of its container. |
| `mode` | `'popup' \| 'redirect'` | `'popup'` | `'popup'` opens a centred window on desktop and falls back to the same tab on phones or when the popup is blocked. `'redirect'` always uses the same tab. |

Two buttons rendered from one instance share one checkout at a time: clicks are ignored while that instance's `createCheckout` is running.

## Events

The button reports what happened with `CustomEvent`s on `document`. Use them for your own UI; your webhook and capture remain the source of truth for payment.

| Event | When | `event.detail` |
|---|---|---|
| `maytes:checkout-opened` | The popup opened. | — |
| `maytes:checkout-closed` | The popup was closed while your page was still open, usually by the shopper. (When the checkout finishes, it sends your page to your `return_url` instead.) | — |
| `maytes:checkout-redirected` | The checkout opened without a popup. | `{ url, target }`, where `target` is `'self'` (this tab), `'top'` (the page around your iframe) or `'tab'` (a new tab) |
| `maytes:checkout-failed` | The checkout could not open. | `{ reason, cause? }`, where `reason` is `'create-checkout-rejected'`, `'invalid-shape'` or `'navigation-blocked'` |

```ts
import type { CheckoutFailedDetail } from '@maytes/checkout-button';

document.addEventListener('maytes:checkout-failed', (event) => {
  const { reason } = (event as CustomEvent<CheckoutFailedDetail>).detail;
  showMessage(reason === 'create-checkout-rejected'
    ? 'We could not start Split with Maytes. Please try again.'
    : 'Split with Maytes is unavailable right now.');
});
```

There are no completion callbacks by design: in redirect mode your page is gone before the checkout finishes, and the hosted checkout returns the shopper to your `return_url`.

## Popup, redirect and iframes

- **Desktop, `mode: 'popup'` (default):** the button opens a 500 × 800 window immediately on click, shows a Maytes loading screen in it, and covers your page with a dimmed "Completing checkout with Maytes…" overlay that has a "Return to Maytes" button. Once `createCheckout` resolves, the window loads the checkout. Pressing Esc closes the popup.
- **Phones (viewport 600px wide or less):** the same tab, even in popup mode.
- **Popup blocked:** the same tab. This is a normal outcome, reported with `maytes:checkout-redirected`, not `failed`.
- **`mode: 'redirect'`:** always the same tab.

### Inside an iframe

The hosted checkout must run in the top-level window, because its session cookie is refused inside a cross-site frame. If you render the button inside an iframe, the SDK navigates the top-level window; if the browser refuses, it opens a new tab; if both are refused it dispatches `maytes:checkout-failed` with `reason: 'navigation-blocked'`. When the checkout opens in a new tab, no popup poll starts and no `maytes:checkout-opened` / `maytes:checkout-closed` pair fires — you'll only see `maytes:checkout-redirected` with `target: 'tab'`. A sandboxed iframe needs `allow-scripts allow-same-origin allow-top-navigation` (plus `allow-popups allow-popups-to-escape-sandbox` for the tab fallback). Listen to `maytes:checkout-redirected` and read `event.detail.target` (`'self'`, `'top'` or `'tab'`) if your page needs to know where the checkout went. Rendering the button in the top-level page avoids all of this.

## With Stripe's Payment Element

If your checkout already uses Stripe's Payment Element, you can offer Split with Maytes inside it as a Stripe custom payment method. The guide is at [developers.maytes.co/stripe](https://developers.maytes.co/stripe): the Payment Element shows the option, `elements.submit()` tells you it was picked, and your page sends the shopper to the `checkoutUrl` your server returns. You can also place this button beside the Stripe form; it works the same as on any other page.

## Security and CSP

- **Keep credentials on your server.** The browser only ever sees `checkoutId` and `checkoutUrl`. Treat `checkoutId` like a magic link: it identifies the shopper's checkout session.
- **Scripts:** allow the CDN with `Content-Security-Policy: script-src 'self' https://js.maytes.co;`. With a pinned URL you can also add `integrity` (SRI); see [Install and versioning](#install).
- **Styles:** the button injects a `<style>` tag. On a strict `style-src` policy, pass your nonce as the second argument so it's set on every style tag the SDK adds:

  ```ts
  const maytes = Maytes({ createCheckout, environment: 'production' }, { cspNonce: 'your-nonce' });
  ```
- The bundle uses no `eval`, `Function` or string timers, so `'unsafe-eval'` is never needed.

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

## Mobile app

After checkout, shoppers split the cost with friends using Maytes payment links (`app.maytes.co/…`). On a phone with the Maytes app installed, those links open directly in the app (iOS Universal Links / Android App Links); otherwise they open in the browser. Maytes handles this end to end — merchants integrate only the button and configure nothing for the app.

## Troubleshooting

| What you see | What it means |
|---|---|
| `window.Maytes is undefined` or `Maytes is not a function` | The CDN script hasn't loaded when your code runs. Put your code after the `<script src="https://js.maytes.co/…">` tag (not `async`), or run it from that script's `load` event. Check that your CSP allows `https://js.maytes.co`. |
| No button appears | `renderButton` needs an existing `HTMLElement`; a missing element throws `MaytesError` (`CONFIG`) in the console. Render after the container exists (for example in `useEffect` or `onMounted`). |
| The checkout opened in the same tab instead of a popup | Expected on phones (600px wide or less) and when the browser blocks the popup; `maytes:checkout-redirected` fires. |
| The spinner shows, then the button resets | `createCheckout` failed: `maytes:checkout-failed` with `create-checkout-rejected` (your request threw or rejected) or `invalid-shape` (it didn't return `{ checkoutId }`). The console has the error. A common cause is returning the API's `checkout_uuid` instead of `checkoutId`. |
| The checkout says it can't be found | The checkout was created in one environment and opened in the other. Return `checkoutUrl` from your server, and use sandbox credentials with `environment: 'sandbox'`. |
| CSP errors about inline styles | Pass `{ cspNonce }` as the second argument to `Maytes()`; see [Security and CSP](#security-and-csp). |
| Inside an iframe, nothing happens and `navigation-blocked` fires | The browser refused both the top-level navigation and a new tab. Add `allow-top-navigation` (and `allow-popups allow-popups-to-escape-sandbox`) to the iframe's `sandbox`, or render the button in the top-level page. |

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
