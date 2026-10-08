# API reference

Every option, method and default of the `@maytes/checkout-button` browser SDK.

`Maytes` is a callable factory, like `Stripe()`. Each call returns an isolated instance. From the script tag it is `window.Maytes`; from npm it is `import { Maytes } from '@maytes/checkout-button'`.

## `Maytes(options)`

| Option | Type | Description |
|---|---|---|
| `createCheckout` | `() => Promise<{ checkoutId: string; checkoutUrl?: string }>` | Required. Called when the shopper clicks; asks your server for a checkout. Throw (or reject) to report a failure. |
| `environment` | `'sandbox' \| 'production'` | Required. Which Maytes environment the checkout opens in when you don't return `checkoutUrl`: `sandbox` opens `https://sandbox-checkout.maytes.co`, `production` opens `https://checkout.maytes.co`. |

Returns a `MaytesSDK` instance. Invalid options throw `MaytesError` with `code: 'CONFIG'`.

An optional second argument, `{ cspNonce }`, sets a nonce on the styles the SDK injects; see [Security and CSP](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/security-csp.md).

## Instance methods

| Method | Returns | Description |
|---|---|---|
| `renderButton(container, options?)` | `() => void` | Renders the button into `container` (an `HTMLElement`) and returns a function that removes it. |
| `redirectToCheckout({ checkoutId, replace? })` | `void` | Sends the current tab to a checkout you already created, without a button. `replace: true` replaces the history entry. Inside an iframe it navigates the top-level window and throws `MaytesError` if the browser refuses. |
| `checkoutUrl({ checkoutId })` | `string` | Builds the hosted checkout URL for a checkout you already created. |
| `destroy()` | `void` | Tears down the instance: buttons, listeners, the overlay and a popup that hasn't loaded yet. Idempotent. |

Call `destroy()` when the page or component goes away, or when you need an instance with a different `environment`. Don't call it because your own code saw the payment succeed: that can tear down a checkout that's still in progress. To remove one button, call the function `renderButton()` returned.

## `renderButton` options

| Option | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Split with'` | Text before the Maytes logo. The accessible name is `"<label> Maytes"`. |
| `block` | `boolean` | `false` | `true` makes the button fill the width of its container. |
| `mode` | `'popup' \| 'redirect'` | `'popup'` | `'popup'` opens a centred window on desktop and falls back to the same tab on phones or when the popup is blocked. `'redirect'` always uses the same tab. |

Two buttons rendered from one instance share one checkout at a time: clicks are ignored while that instance's `createCheckout` is running.

## Examples

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({
  environment: 'production',
  createCheckout: async () => {
    const res = await fetch('/api/maytes/checkout', { method: 'POST' });
    if (!res.ok) throw new Error('Could not create the Maytes checkout');
    return res.json();
  },
});

const removeButton = maytes.renderButton(document.getElementById('maytes-button')!, {
  label: 'Split with',
  block: true,
  mode: 'redirect',
});

const url = maytes.checkoutUrl({ checkoutId: '019fbb9e-ecd1-7059-99f3-f8bf47b63931' });
maytes.redirectToCheckout({ checkoutId: '019fbb9e-ecd1-7059-99f3-f8bf47b63931', replace: true });

removeButton();
maytes.destroy();
```

## Errors

`MaytesError` (exported from the package) is thrown for invalid configuration: options that aren't an object, a missing `createCheckout`, an unknown `environment`, a `renderButton` container that isn't an `HTMLElement`, an unknown `mode`, or a call on a destroyed instance. Its `code` is always `'CONFIG'`. Problems after the click (your request failing, the wrong response shape) are reported as [events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md), not thrown.

Next: [Events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md) · [Popup, redirect and iframes](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/launch-behaviour.md)
