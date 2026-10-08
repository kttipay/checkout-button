# Troubleshooting

Common symptoms when adding the Split with Maytes button, and what they mean.

| What you see | What it means |
|---|---|
| `window.Maytes is undefined` or `Maytes is not a function` | The CDN script hasn't loaded when your code runs. Put your code after the `<script src="https://js.maytes.co/…">` tag (not `async`), or run it from that script's `load` event. Check that your CSP allows `https://js.maytes.co`. |
| No button appears | `renderButton` needs an existing `HTMLElement`; a missing element throws `MaytesError` (`CONFIG`) in the console. Render after the container exists, for example in `useEffect` or `onMounted`. |
| Two buttons appear in React development mode | The instance isn't destroyed in the effect's cleanup. Return `() => maytes.destroy()` from the effect that created it. |
| The checkout opened in the same tab instead of a popup | Expected on phones (600px wide or less) and when the browser blocks the popup; `maytes:checkout-redirected` fires. |
| The spinner shows, then the button resets | `createCheckout` failed: `maytes:checkout-failed` with `create-checkout-rejected` (your request threw or rejected) or `invalid-shape` (it didn't return `{ checkoutId }`). The console has the error. A common cause is returning the API's `checkout_uuid` instead of `checkoutId`. |
| The checkout says it can't be found | The checkout was created in one environment and opened in the other. Return `checkoutUrl` from your server, and use sandbox credentials with `environment: 'sandbox'`. |
| CSP errors about inline styles | Pass `{ cspNonce }` as the second argument to `Maytes()`; see [Security and CSP](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/security-csp.md). |
| Inside an iframe, nothing happens and `navigation-blocked` fires | The browser refused both the top-level navigation and a new tab. Add `allow-top-navigation` (and `allow-popups allow-popups-to-escape-sandbox`) to the iframe's `sandbox`, or render the button in the top-level page. |
| The order authorises but is never paid | Your server isn't capturing on `checkout.authorized` within 2 minutes. See [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md). |

Still stuck? Open an issue at [github.com/kttipay/maytes-checkout-button/issues](https://github.com/kttipay/maytes-checkout-button/issues) or contact [support@maytes.co](mailto:support@maytes.co).
