# Popup, redirect and iframes

Where the Maytes checkout opens on desktop, on phones, when popups are blocked and inside an iframe.

## Where the checkout opens

- **Desktop, `mode: 'popup'` (default):** the button opens a 500 × 800 window immediately on click and shows a Maytes loading screen in it. Your page is covered with a dimmed "Completing checkout with Maytes…" overlay that has a "Return to Maytes" button. Once `createCheckout` resolves, the window loads the checkout. Pressing Esc closes the popup.
- **Phones (viewport 600px wide or less):** the same tab, even in popup mode.
- **Popup blocked:** the same tab. This is a normal outcome, reported with `maytes:checkout-redirected`, not `maytes:checkout-failed`.
- **`mode: 'redirect'`:** always the same tab.

When the shopper finishes, the hosted checkout returns them to your `return_url`. In popup mode it sends your page there and closes the popup.

The popup opens synchronously inside the click, before your `createCheckout` runs, so browsers treat it as a direct result of the shopper's click.

### A loading overlay for same-tab launches

By default a same-tab launch shows only the button's spinner while `createCheckout` runs. Pass `redirectOverlay: true` to `renderButton()` or `openCheckout()` to cover the page with the Maytes overlay ("Taking you to Maytes…", without the "Return to Maytes" button) until the page leaves:

```ts
import { Maytes } from '@maytes/checkout-button';

const maytes = Maytes({ createCheckout, environment: 'sandbox' });
maytes.renderButton(document.getElementById('maytes-button')!, { mode: 'redirect', redirectOverlay: true });
```

The overlay goes away if `createCheckout` fails, and clears itself when the shopper comes back with the back button. Invalid values throw `MaytesError` (`CONFIG`).

## Inside an iframe

The hosted checkout must run in the top-level window, because its session cookie is refused inside a cross-site frame. If you render the button inside an iframe:

1. The SDK navigates the top-level window.
2. If the browser refuses, it opens a new tab.
3. If both are refused, it dispatches `maytes:checkout-failed` with `reason: 'navigation-blocked'` and leaves the button usable.

When the checkout opens in a new tab, no popup poll starts and no `maytes:checkout-opened` / `maytes:checkout-closed` pair fires; you'll only see `maytes:checkout-redirected` with `target: 'tab'`. Read `event.detail.target` (`'self'`, `'top'` or `'tab'`) if your page needs to know where the checkout went.

A sandboxed iframe needs `allow-scripts allow-same-origin allow-top-navigation`, plus `allow-popups allow-popups-to-escape-sandbox` for the tab fallback. Rendering the button in the top-level page avoids all of this.

Next: [Events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
