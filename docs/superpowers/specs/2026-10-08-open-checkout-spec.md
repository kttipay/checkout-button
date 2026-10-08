# `openCheckout()` — start the Maytes checkout from the merchant's own button

Status: draft, awaiting review
Target release: `1.2.0` (minor, additive)
Scope: `src/` public API, `docs/overview.md`, `README.md`, a changeset. Out of scope: the hosted checkout app, the merchant API, and the developers.maytes.co pages (follow-ups listed at the end).

## 1. Problem

A merchant that already runs Stripe's Payment Element can offer **Split with Maytes** inside it as a Stripe custom payment method (`cpmt_…`). The customer picks it in Stripe's form and presses **the merchant's own Pay button**. The merchant then has to start the Maytes checkout from that button.

Today the SDK can only open the Maytes **popup** from the button it draws itself:

- Everything the popup needs lives inside the click handler that `renderButton()` attaches (`src/button.ts`, `handleClick`). That covers opening the blank window synchronously, painting the branded loader, showing the overlay, polling for close, calling `createCheckout`, navigating the popup, and the phone, blocked-popup and iframe fallbacks.
- The only other entry point, `redirectToCheckout({ checkoutId })`, needs a checkout that already exists and always navigates the current tab. It never opens a popup.

So a merchant with its own Pay button can only redirect. The workaround is to render the SDK button hidden and call `.click()` on it from their handler. That is fragile, and our own showcase test suite bans it.

This came up building the Stripe demo merchant on the showcase (kttipay/checkout-web#914). There, Tidepool's "Shop's Pay button" mode has to disable the popup option for exactly this reason.

### Why the browser part is already solved

Popups are only allowed as a direct result of a click. The documented Stripe flow awaits `elements.submit()` before it knows Maytes was picked, which can cost the click its "freshness" in Safari. But the Payment Element's `change` event reports `event.value.type === '<cpmt id>'` the moment the customer picks Split with Maytes. This was verified live against Stripe.js on 2026-10-08 with the Maytes sandbox account. A merchant can therefore decide on the click itself and call the SDK synchronously, with no `submit()` round trip. The only missing piece is an SDK function to call.

## 2. Goals and non-goals

Goals
- A public instance method that runs **exactly** the launch flow a rendered button's click runs today, without drawing a button.
- Popup-safe by construction: the blank popup is opened synchronously inside the call, before any `await`.
- Same events, same fallbacks, same busy gating as the button.
- No behaviour change for `renderButton()`; every existing test stays green unchanged.

Non-goals
- No completion callbacks (`onComplete`, `onCancel`). The overview's contract stands: the hosted checkout owns terminal flow and the merchant return. The new method only reports how the **launch** went.
- No Stripe-specific code in the SDK. It must not import or know about Stripe.
- No change to event scoping. Events stay on `document`; per-instance scoping is a separate improvement (§9).

## 3. API

```ts
interface OpenCheckoutOptions {
  /** Same meaning and default as renderButton's mode: 'popup' (default) | 'redirect'. */
  mode?: RenderButtonMode;
}

type OpenCheckoutResult =
  | { outcome: 'popup' }                                   // popup navigated to the hosted checkout
  | { outcome: 'redirected'; target: RedirectTarget }      // same tab / top window / new tab
  | { outcome: 'failed'; reason: CheckoutFailedReason }    // matches maytes:checkout-failed
  | { outcome: 'closed' }                                  // customer closed the popup before it loaded
  | { outcome: 'ignored' };                                // a launch on this instance is already in flight

interface MaytesSDK {
  // existing members unchanged
  openCheckout(options?: OpenCheckoutOptions): Promise<OpenCheckoutResult>;
}
```

Usage, the Stripe Payment Element recipe:

```js
const maytes = Maytes({ environment: 'sandbox', createCheckout });

let maytesSelected = false;
paymentElement.on('change', (event) => {
  maytesSelected = event.value.type === MAYTES_CPM_ID;
});

payButton.addEventListener('click', async () => {
  if (maytesSelected) {
    maytes.openCheckout();            // call it inside the click, before any await
    return;
  }
  const { error } = await elements.submit();
  // ... the merchant's normal Stripe card flow
});
```

### Contract

| Condition | Behaviour |
|---|---|
| Called on a wide viewport, mode `popup` (default) | `window.open('about:blank', …)` runs **synchronously during the call**, then the loader is painted, the overlay shown, `maytes:checkout-opened` dispatched, and only then `createCheckout()` awaited. Resolves `{ outcome: 'popup' }` after `popup.location.replace(url)`. |
| Phone viewport (≤ 600 px, same measurement as the button), or mode `redirect` | Same-tab or top-level navigation as the button does; `maytes:checkout-redirected`; resolves `{ outcome: 'redirected', target }`. |
| Popup blocked (for example, called outside a click) | Falls back to redirect exactly like the button, with `console.warn`; resolves `redirected`. |
| `createCheckout` rejects | Popup closed, overlay hidden, `console.error`, `maytes:checkout-failed` (`create-checkout-rejected`); resolves `{ outcome: 'failed', reason }`. **Never rejects.** |
| `createCheckout` resolves the wrong shape | As above with `invalid-shape`. |
| Framed and every navigation refused | `maytes:checkout-failed` (`navigation-blocked`); resolves `failed`. |
| Customer closes the popup before it loads the checkout | As the button does today: overlay hidden, `maytes:checkout-closed`, and a late `createCheckout` result or rejection is discarded. Resolves `{ outcome: 'closed' }`. |
| A launch is already in flight on this instance (button click or `openCheckout`) | No-op, `createCheckout` not called again; resolves `{ outcome: 'ignored' }`. |
| Instance destroyed | Throws `MaytesError(CONFIG)` synchronously, as `renderButton()` does. |
| `mode` not `'popup' \| 'redirect'` | Throws `MaytesError(CONFIG)` synchronously. |

The promise reports the **launch**, not the payment. It settles at the same point where the button would return to idle or hand over to the popup.

## 4. Design

Extract the body of `handleClick` into one internal function and make both entry points call it.

```
src/
├── launch.ts   NEW  launchCheckout(state, mode): Promise<OpenCheckoutResult>
│                    popup open → loader → overlay → opened event → poll → createCheckout
│                    → validate → navigate popup | navigateAway → failed / redirected events
├── button.ts        renderButton(): builds the DOM, validates mode, registers its busy view,
│                    click → launchCheckout(state, mode)   (result ignored)
├── maytes.ts        sdk.openCheckout(opts) → validate (destroyed, mode) → launchCheckout(state, mode)
├── state.ts         + busyViews: Set<(busy: boolean) => void>
└── types.ts         + OpenCheckoutOptions, OpenCheckoutResult, MaytesSDK.openCheckout
```

- **Busy state stays per instance.** `launchCheckout` sets `state.busy` and notifies `state.busyViews`. Each rendered button registers a view that swaps its logo and spinner and sets `aria-busy` / `aria-disabled`, which is today's `setBusy`. So a rendered button on the same instance also shows busy while an `openCheckout()` launch is in flight, and is gated by the same flag. The button's cleanup removes its view.
- **`teardownActiveCheckout`, `onPopupClosed`, `dispatchFailed`, `dispatchRedirected`, `navigateAway` and `closeOrphanPopup`** move into `launch.ts` unchanged, except that they report through `busyViews` instead of a closure over one button.
- **Synchronous popup open.** `launchCheckout` is an `async` function whose first `await` comes after `window.open`. A test pins this (§6), because moving any `await` above it would silently break popups in Safari.
- `destroy()` already tears down the popup, the poll and the overlay through `state`, so it covers `openCheckout` launches with no change.

## 5. Docs and release

- `README.md`: an API table row for `openCheckout(options?)`, plus a short "Using your own button (for example a Stripe Payment Element)" section with the recipe above. Its one rule is to call it inside the click, before any `await`.
- `docs/overview.md`: Public API entry, the contract rows from §3 under "Behaviour contracts", and `launch.ts` in "Internal architecture".
- Changeset: `minor`, so 1.2.0. The evergreen `js.maytes.co/v1/` picks it up; pinned URLs are unaffected.
- Before release: verify on the showcase's `/tidepool` in Shop's-button mode, popup, in Chrome and Safari. Load the unreleased build either from the `js.maytes.co/dev` channel (the `dev` branch's CDN preview) or as a local build. Today only the showcase's iframe bench reads the `?sdk=` override, so wire that override into Tidepool as part of the consumer change in §7.

## 6. Tests (vitest, jsdom, existing `fake-popup` / `fake-location` helpers)

New `src/test/open-checkout.test.ts`:

1. Popup mode opens `about:blank` **before** `createCheckout` is invoked, and before the returned promise yields to a microtask.
2. Loader painted, overlay shown, `maytes:checkout-opened` dispatched; resolves `{ outcome: 'popup' }` after the popup navigates to `checkoutUrl` (or the built URL when only `checkoutId` is returned).
3. Phone width (600) gets a redirect, `maytes:checkout-redirected`, and `{ outcome: 'redirected', target: 'self' }`; width 601 gets a popup.
4. `mode: 'redirect'` never calls `window.open`.
5. Blocked popup (`window.open` returns `null`) gets the redirect fallback, `console.warn` and `redirected`.
6. `createCheckout` rejects: popup closed, overlay gone, `failed` event, resolves `failed` with `create-checkout-rejected`, never rejects.
7. Invalid shape: same with `invalid-shape`.
8. A second call while one is in flight resolves `ignored`, and `createCheckout` is called once.
9. A rendered button on the same instance shows the spinner and ignores clicks while an `openCheckout()` launch is in flight, and returns to the logo afterwards. The reverse also holds: `openCheckout()` resolves `ignored` while a button launch is in flight.
10. Destroyed instance and invalid `mode` throw `MaytesError(CONFIG)` synchronously.
11. Framed with both navigations refused resolves `failed` with `navigation-blocked`.
12. `destroy()` during an `openCheckout` popup launch closes the popup and hides the overlay (parity with the button test).
13. Closing the popup while `createCheckout` is pending: `maytes:checkout-closed`, overlay gone, resolves `closed`; the late result does not navigate anything.

Existing `button.test.ts` must pass **unchanged**. That is the guard that the extraction did not change button behaviour. Coverage thresholds (90/90/90/85) apply to `launch.ts`.

## 7. Consumers once released

- **Showcase (kttipay/checkout-web, `mock/showcase`)**: enable Popup for Tidepool's "Shop's" Pay button. That button calls `maytes.openCheckout({ mode })` on the click when the last `change` event named the Maytes `cpmt_` id. The showcase test `sdk-button-on-every-merchant.test.ts` bans the identifier `openCheckout` in merchant pages because it targets the hidden-button helper in `useMaytesCheckout`. Rename that helper (for example `clickHiddenSdkButton`) and point the test at it, so the public SDK method is allowed.
- **developers.maytes.co/stripe** (kttipay/api-ts-v3 `docs/merchant-doc/stripe.md`): add a "Open Maytes in a popup" section using the recipe. Return `checkout_uuid` alongside `checkout_url` from the example backend, because the SDK needs the id.

## 8. Risks

- **Extraction regressions** in the most-tested file: mitigated by keeping `button.test.ts` untouched and green.
- **Merchants calling it after an `await`:** documented. The result is still a working checkout via the redirect fallback, just not a popup.
- **Two instances on one page** still share document-level events; unchanged by this spec (§9).

## 9. Open questions

1. **Name:** `openCheckout` (proposed; matches what it does to the customer), `launchCheckout`, or `startCheckout`.
2. **Return value:** a launch-result promise (proposed; lets a merchant re-enable its own button per call) versus `void` with events only (closer to today's event-only philosophy).
3. **`closed` outcome:** the spec adds `{ outcome: 'closed' }` for a popup closed before the checkout loads (the button only fires `maytes:checkout-closed`). Confirm, or fold it into `failed`.
4. **Same release, or not:** the redirect-mode loading overlay (today redirect mode only shows the button spinner while `createCheckout` runs; it needs a `pageshow` handler so a back-button restore clears it), and an optional `detail.source: 'button' | 'api'` on events. Proposed: separate PRs.
