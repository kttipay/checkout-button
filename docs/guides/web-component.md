# Any framework: `<maytes-checkout-button>`

One standard custom element for plain HTML, Vue/Nuxt, Angular, Svelte/SvelteKit, Solid and React 19.

- **Attributes** for options: `environment` (required), `mode`, `label`, `block`, `radius`, `height`, `nonce`.
- **Property** `createCheckout`: your async function that asks your server for a checkout and returns `{ checkoutId, checkoutUrl? }`. Nothing renders until it is set.
- **Events** on the element, for this element only: `maytes-opened`, `maytes-closed`, `maytes-redirected`, `maytes-failed`. They bubble and carry the same `detail` as the [`maytes:checkout-*` events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md).
- **Method** `open({ mode })`: starts the checkout from your own button, like [`openCheckout()`](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/own-button.md).
- **Mistakes don't throw:** an invalid attribute is logged and arrives as `maytes-failed` with `detail.reason === 'config'`.

## Plain HTML

```html
<script src="https://js.maytes.co/v1/checkout-button.element.js" crossorigin="anonymous"></script>

<maytes-checkout-button id="maytes" environment="sandbox" block></maytes-checkout-button>

<script>
  const button = document.getElementById('maytes');
  button.createCheckout = async () => {
    const res = await fetch('/api/maytes/create-checkout', { method: 'POST' });
    return res.json(); // { checkoutId, checkoutUrl? }
  };
  button.addEventListener('maytes-failed', (event) => console.warn(event.detail));
</script>
```

`/v1/` always serves the newest 1.x release, so no `integrity` is possible. For SRI, pin `https://js.maytes.co/vX.Y.Z/checkout-button.element.js` and use the `checkout-button.element.js` hash from the release's `integrity.json`.

## npm (any bundler)

```js
import '@maytes/checkout-button/element';
```

## Vue 3 and Nuxt 3

Tell Vue the tag is a custom element, then bind the function as a DOM property:

<!-- typecheck: skip -->
```js
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'maytes-checkout-button' } } });

// Nuxt: nuxt.config.ts → vue: { compilerOptions: { isCustomElement: (tag) => tag === 'maytes-checkout-button' } },
// and import '@maytes/checkout-button/element' from plugins/maytes.client.ts (browser only).
```

```vue
<maytes-checkout-button environment="sandbox" :createCheckout.prop="createCheckout" @maytes-failed="onFailed" />
```

## Angular

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@maytes/checkout-button/element';

@Component({
  selector: 'app-pay-with-maytes',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<maytes-checkout-button environment="sandbox" [createCheckout]="createCheckout" (maytes-failed)="onFailed($event)"></maytes-checkout-button>`,
})
export class PayWithMaytes {
  createCheckout = () => fetch('/api/maytes/create-checkout', { method: 'POST' }).then((res) => res.json());
  onFailed(event: Event) { console.warn((event as CustomEvent).detail); }
}
```

## Svelte and SvelteKit

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  let button: HTMLElement & { createCheckout?: typeof createCheckout };
  onMount(async () => {
    await import('@maytes/checkout-button/element'); // browser only
    button.createCheckout = createCheckout;
    button.addEventListener('maytes-failed', onFailed);
  });
</script>

<maytes-checkout-button bind:this={button} environment="sandbox"></maytes-checkout-button>
```

## Solid

```jsx
import '@maytes/checkout-button/element';

<maytes-checkout-button environment="sandbox" prop:createCheckout={createCheckout} on:maytes-failed={onFailed} />
```

## Your own button, any framework

```js
import '@maytes/checkout-button/element';

await customElements.whenDefined('maytes-checkout-button');
const element = document.querySelector('maytes-checkout-button');
payButton.addEventListener('click', () => {
  element?.open({ mode: 'popup' }); // inside the click, before any await
});
```

React 19 sets `createCheckout` as a property on the element directly. For TypeScript, add `'maytes-checkout-button'` to `JSX.IntrinsicElements`.

Next: [Events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md) · [Using your own button](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/own-button.md)
