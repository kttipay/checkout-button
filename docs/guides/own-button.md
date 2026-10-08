# Using your own button

Start the Maytes checkout from a button you already have, such as the Pay button of a Stripe Payment Element checkout.

If your page already has its own Pay button, for example a Stripe Payment Element checkout that offers **Split with Maytes** as a Stripe custom payment method, start Maytes from that button with `openCheckout()`:

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({ createCheckout, environment: 'sandbox' });

let maytesSelected = false;
paymentElement.on('change', (event) => {
  maytesSelected = event.value.type === MAYTES_CPM_ID;
});

payButton.addEventListener('click', async () => {
  if (maytesSelected) {
    const result = await maytes.openCheckout();
    if (result.outcome === 'failed') showMessage('Could not start Split with Maytes. Please try again.');
    return;
  }
  // ... your normal card flow
});
```

**Call `openCheckout()` inside the click handler, before any `await`.** Browsers only allow a popup straight from a click: the SDK opens the window during the call and creates the checkout afterwards. Called later, the popup may be blocked; the SDK then redirects instead, so the payment still works.

`openCheckout({ mode })` takes the same `mode` as `renderButton()`: `'popup'` (default) or `'redirect'`. It resolves with how the launch ended:

| `outcome` | Meaning |
|---|---|
| `popup` | The popup loaded the Maytes checkout. |
| `redirected` | The page (or the top window, or a new tab: `target`) went to the Maytes checkout. |
| `failed` | `createCheckout` failed or returned the wrong shape, or every way out of an iframe was refused (`reason`, same as `maytes:checkout-failed`). |
| `closed` | The customer closed the popup before the checkout loaded. |
| `ignored` | A checkout launch from this instance was already in flight. |

It never rejects. It throws `MaytesError` (`CONFIG`) synchronously on a destroyed instance or an invalid `mode`. Buttons rendered by the same instance ignore clicks while any launch is in flight.

Next: [With Stripe's Payment Element](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/stripe-payment-element.md) · [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md)
