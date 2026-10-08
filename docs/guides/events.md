# Events

The four `maytes:checkout-*` events the button dispatches, and how to listen to them.

The button reports what happened with `CustomEvent`s on `document`. Use them for your own UI; your webhook and capture remain the source of truth for payment.

| Event | When | `event.detail` |
|---|---|---|
| `maytes:checkout-opened` | The popup opened. | — |
| `maytes:checkout-closed` | The popup was closed while your page was still open, usually by the shopper. (When the checkout finishes, it sends your page to your `return_url` instead.) | — |
| `maytes:checkout-redirected` | The checkout opened without a popup. | `{ url, target }`, where `target` is `'self'` (this tab), `'top'` (the page around your iframe) or `'tab'` (a new tab) |
| `maytes:checkout-failed` | The checkout could not open. | `{ reason, cause? }`, where `reason` is `'create-checkout-rejected'`, `'invalid-shape'` or `'navigation-blocked'` |

```ts
import type { CheckoutFailedDetail, CheckoutRedirectedDetail } from '@maytes/checkout-button';

document.addEventListener('maytes:checkout-failed', (event) => {
  const { reason } = (event as CustomEvent<CheckoutFailedDetail>).detail;
  showMessage(reason === 'create-checkout-rejected'
    ? 'We could not start Split with Maytes. Please try again.'
    : 'Split with Maytes is unavailable right now.');
});

document.addEventListener('maytes:checkout-redirected', (event) => {
  const { target } = (event as CustomEvent<CheckoutRedirectedDetail>).detail;
  if (target === 'tab') showMessage('Split with Maytes opened in a new tab.');
});
```

- `failed` reasons: `create-checkout-rejected` means your `createCheckout` threw or rejected; `invalid-shape` means it didn't resolve to `{ checkoutId, checkoutUrl? }`; `navigation-blocked` means the button is inside an iframe and the browser refused both the top-level navigation and a new tab.
- A blocked popup is not a failure: the button opens the checkout in the same tab and dispatches `maytes:checkout-redirected`.
- There are no completion callbacks by design: in redirect mode your page is gone before the checkout finishes, and the hosted checkout returns the shopper to your `return_url`.
- In React, Vue or another framework, add listeners when the component mounts and remove them when it unmounts.

Next: [Popup, redirect and iframes](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/launch-behaviour.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
