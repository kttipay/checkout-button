# Button appearance, instance-scoped events and React bindings

Status: draft, awaiting review
Target release: `1.3.0` (minor, additive), after `openCheckout()` (`docs/superpowers/specs/2026-10-08-open-checkout-spec.md`, PR #23)
Scope: `src/` public API and styles, a new `react` entry point, `package.json` exports, `tsup.config.ts`, `docs/overview.md`, `README.md`, changesets. Out of scope: the hosted checkout app and the design-system repository. Any colour role the SDK lacks is an upstream token change synced with `npm run sync:foundation`.

## 1. Problem

The showcase now has a Stripe merchant demo (kttipay/checkout-web#914, `demo.maytes.co/tidepool`) with a **"Maytes shown in: Express row"** layout. It puts our real SDK button in an express-checkout row next to Apple Pay, Google Pay and Link, which is how a sandbox merchant already lays out its checkout. Two problems show up straight away:

- **Shape.** The button is a pill (`border-radius: 999px`, `src/styles.ts`, `.maytes-checkout-button`) beside wallet buttons with about 6px corners. Merchants have no supported way to change it. The only styling hook today is `--maytes-button-font-size`.
- **Wrapping.** In a quarter-width cell, the `Split with` label (a text node before the logo, `src/button.ts`) wraps onto two lines. Nothing in the CSS stops it.

The wallet buttons it sits next to all follow the same pattern. Their **content is brand-locked** (logo, label and a small set of colour themes). Their **geometry is merchant-controlled** within limits:
- Stripe's Express Checkout Element has `buttonHeight` (40–55px) and a border radius through its appearance options.
- Google Pay has `buttonRadius`.
- Apple Pay allows a corner radius and black, white or white-outline styles.

Two more gaps come from the same integrations:

- **Events can't be told apart.** `maytes:checkout-opened`, `-closed`, `-redirected` and `-failed` are dispatched on `document` (`src/button.ts`, `dispatchFailed` / `dispatchRedirected` / `onPopupClosed`) with no information about which `Maytes()` instance sent them. Two instances on one page, or a framework wrapper per button, cannot tell their events apart.
- **React integrations keep rewriting the same wrapper.** Three hand-built wrappers already exist:
  - the showcase's `useMaytesCheckout` hook;
  - the API team's e2e `StorefrontPayButton`, which polls for `window.Maytes`;
  - a sandbox merchant's own launcher.

  Each solves the same problems by hand: creating the instance once, reading the latest cart, surviving React's StrictMode double mount, keeping server rendering safe, waiting for the script, and adding and removing `document` listeners. The README's stance, "no React/Vue/Angular binding to keep in sync" (`README.md`, Framework-agnostic), was meant to avoid a maintenance burden, but the burden has moved to every integrator.

## 2. Goals and non-goals

Goals
- Merchants can match the button's **height and corner radius** to the row it sits in, and pick a **brand-approved colour theme**. They cannot change the logo, the brand colours, or the label beyond today's `label` option.
- The label **never wraps**; a narrow full-width button switches to a compact, logo-led rendering.
- Every `maytes:checkout-*` event says **which instance** sent it.
- A first-party **React entry point** that removes the hand-built wrappers.

Non-goals
- No arbitrary colours, fonts or logo changes.
- No Vue or Angular bindings in this release (the same pattern can follow).
- No change to default rendering: with no new options, the button looks and behaves exactly as today.

## 3. Part A: appearance options

### API (proposal)

```ts
type ButtonTheme = 'maroon' | 'light' | 'outline';

interface RenderButtonOptions {
  label?: string;          // unchanged
  block?: boolean;         // unchanged
  mode?: RenderButtonMode; // unchanged
  radius?: number;         // px; default: pill (today)
  height?: number;         // px, 40..55; default: today's natural height
  theme?: ButtonTheme;     // default 'maroon' (today)
}
```

### Contract

| Option | Accepted | Rendered as | Invalid input |
|---|---|---|---|
| `radius` | finite number ≥ 0 | `--maytes-button-radius: <n>px` on the button. The effective radius is clamped to half the rendered height, so a large value stays a pill. | negative or non-finite → `MaytesError(CONFIG)` |
| `height` | 40 ≤ n ≤ 55 (Stripe's `buttonHeight` range) | `--maytes-button-height: <n>px`; content centred vertically; the font size stays `--maytes-button-font-size` | outside the range or non-finite → `MaytesError(CONFIG)` |
| `theme` | `'maroon'`, `'light'`, `'outline'` | colours from `src/foundation/brand.generated.ts` only (table below) | any other value → `MaytesError(CONFIG)` |
| *(always)* | n/a | `white-space: nowrap` on the label | n/a |

Validation matches `mode` today: a synchronous throw from `renderButton()`, listed under "Behaviour contracts" in `docs/overview.md`.

### Implementation (proposal)

- `src/styles.ts` reads custom properties with today's values as fallbacks, so the default rendering is byte-for-byte unchanged:
  - `border-radius: var(--maytes-button-radius, 999px)`
  - `min-height: var(--maytes-button-height, auto)`
- `renderButton()` sets the custom properties inline on the button element (`style.setProperty`). There's no injected style text per option, so strict style CSPs keep working through the existing `cspNonce` path. Page CSS can also set the same properties on an ancestor; an explicit option wins because it's set on the element.
- The label text node moves into a `span.maytes-checkout-button__label` so it can be styled and hidden, while the `aria-label` stays `"<label> Maytes"`.

### Themes and brand guardrails

The generated foundation subset today has `brand.primary`, `brand.secondary`, `palette.burgundy.700`, `palette.base.white` and `text.primaryInverse` (`src/foundation/brand.generated.ts`).

| Theme | Background | Text and logo | Hover | Token status |
|---|---|---|---|---|
| `maroon` (default, today) | `brand.primary` | `text.primaryInverse` | `palette.burgundy.700` | all available |
| `light` | `palette.base.white` | `brand.primary` | not in the subset | needs a hover role, synced from kttipay/designsystem |
| `outline` | transparent, 1.5px `brand.primary` border | `brand.primary` | not in the subset | needs a hover role, synced from kttipay/designsystem |

| Merchants can change | Merchants cannot change |
|---|---|
| height (40–55px), corner radius, theme (from the three), width (`block`), label text (existing option), font size (existing variable) | colours outside the themes, the logo, the font family, removing the logo |

### Compact rendering (proposal)

- **Inline buttons** (`block: false`) size to their content, so with `nowrap` they never squeeze. No change.
- **Block buttons** get `container-type: inline-size`, which is safe because their width comes from the container, not their content. An `@container` rule hides the label span below a fixed width threshold in `em`, leaving the logo, the "logo-led" rendering. It's pure CSS, so there's no `ResizeObserver` and the CSP stays clean.
- **Not applied to inline buttons:** inline-size containment on a shrink-to-fit button would collapse its width.
- **The threshold** must be measured as the natural width of `Split with` plus the logo at the default font size. See open question 2.

## 4. Part B: instance-scoped events

Today the four events fire on `document`:
- `opened` and `closed` carry no `detail`;
- `redirected` has `{ url, target }`;
- `failed` has `{ reason, cause? }`.

**Recommendation:** keep every event on `document`, unchanged in name and existing fields, and add two fields:

| Field | Value |
|---|---|
| `detail.instanceId` | a stable id per `Maytes()` instance, also exposed read-only as `maytes.instanceId` |
| `detail.source` | `'button'` or `'api'`, once `openCheckout()` (PR #23) lands |

`opened` and `closed` gain a `detail` object, which is additive. Listeners that ignore `detail` are unaffected.

**Why not dispatch on the button element instead:** an `openCheckout()` launch has no button, and a button can be removed (cleanup) while its popup is still open. An id on the document event works for both entry points and lets one listener filter, which is exactly what the React binding needs. See open question 3.

## 5. Part C: React bindings

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **Subpath `@maytes/checkout-button/react` in this package (recommended)** | ships in lockstep with the core, so there's no version matrix to keep in sync (the README's concern); one install | adds a build entry and an optional peer dependency |
| Separate package (the `@stripe/react-stripe-js` model) | independent release cadence | two versions to keep compatible, which is the sync burden the README wanted to avoid |
| Docs-only recipe | no code to maintain | every merchant still writes the wrapper and repeats its pitfalls |

### Packaging (proposal)

- `package.json`:
  - `exports["./react"]` with `types` / `import` / `require` entries;
  - `peerDependencies: { "react": ">=18" }`;
  - `peerDependenciesMeta: { "react": { "optional": true } }`.

  The core keeps zero runtime dependencies.
- `tsup.config.ts`: a third config for `src/react/index.tsx`, ESM and CJS only, with `external: ['react']`. **Not** added to the IIFE / CDN bundle.
- `csp-check.mjs` and the size checks run on the new entry too.

### API sketch (proposal)

```tsx
import { MaytesProvider, MaytesButton, useMaytes } from '@maytes/checkout-button/react';

<MaytesProvider environment="sandbox" createCheckout={createCheckout}>
  <MaytesButton mode="popup" block radius={6} height={48} theme="maroon"
                onOpened={…} onClosed={…} onRedirected={…} onFailed={…} />
</MaytesProvider>

function OwnButton() {
  const { openCheckout, busy } = useMaytes();      // openCheckout needs PR #23
  return <button onClick={() => openCheckout({ mode: 'popup' })} disabled={busy}>Pay</button>;
}
```

### Design rules, taken from the three existing wrappers

1. **One instance per provider.** It's created in an effect, never during render, and destroyed in the effect cleanup, which also makes the StrictMode double mount safe.
2. **The latest `createCheckout` comes through a ref.** Changing the prop never re-creates the instance or the button. The showcase hook does this with `argsRef`; the e2e button does it with `createBodyRef`.
3. **Safe for server rendering.** There's no `window` or `document` access at import or render time. Effects only.
4. **Per-component callbacks.** Each `MaytesButton` listens once on `document` and forwards only events whose `detail.instanceId` matches its provider's instance, and whose `source` is its own when that's needed (Part B).
5. **`busy`** comes from the same opened, closed, redirected and failed transitions, not from a parallel state machine.
6. **No `window.Maytes` polling.** The binding imports the core module directly; CDN users are unaffected.

## 6. Order and release

1. PR #23: `openCheckout()`.
2. Part B: instance-scoped events. The React callbacks need it.
3. Part A: appearance options.
4. Part C: the React subpath.

Parts A, B and C are proposed together as `1.3.0` with one `minor` changeset. Splitting them into separate minors is fine if review prefers smaller PRs. The evergreen `js.maytes.co/v1/` picks up A and B; C reaches npm users only.

## 7. Tests (vitest, jsdom)

Part A (`button.test.ts`, extended)
1. With no options, the computed `border-radius` is `999px` and no inline custom properties are set: today's rendering is unchanged.
2. `radius: 6` sets `--maytes-button-radius: 6px`; `radius: 100` with `height: 48` renders a 24px effective radius (clamped).
3. `height: 40` and `height: 55` are accepted; `39`, `56`, `NaN` and `-1` throw `MaytesError(CONFIG)`.
4. `theme: 'light'` and `'outline'` use only foundation colours; an unknown theme throws `MaytesError(CONFIG)`.
5. The label is a `span` with `white-space: nowrap`, and the `aria-label` is unchanged.
6. A block button has `container-type: inline-size`; an inline button does not.
7. With `cspNonce`, no style text is injected per option (inline custom properties only).

Part B (`button.test.ts` and the open-checkout tests)
8. All four events carry `detail.instanceId` equal to `maytes.instanceId`; two instances on one page get different ids.
9. The existing `detail` fields of `redirected` and `failed` are unchanged.
10. `detail.source` is `'button'` for clicks and `'api'` for `openCheckout()` (once PR #23 lands).

Part C (`src/test/react.test.tsx`; **new dev dependencies:** `react`, `react-dom`, `@testing-library/react`)
11. The provider creates exactly one instance under StrictMode and destroys it on unmount.
12. Changing `createCheckout` between renders does not re-create the instance, and a click uses the latest function.
13. `MaytesButton` callbacks fire only for its own instance's events (two providers on one page).
14. `useMaytes().busy` follows the launch lifecycle; `openCheckout` is the instance's method.
15. Importing `@maytes/checkout-button/react` with no `window` (node environment) does not throw.
16. The CDN IIFE bundle contains no React code (a build-output assertion).

## 8. Risks

- **Container queries** need Chrome 105, Safari 16 or Firefox 110. Older browsers ignore the rule and show the label on one line, possibly clipped. The default (no `block`) is unaffected.
- **Theme hover colours** need new foundation roles. If the design system doesn't add them, ship `light` and `outline` without a hover change, or drop them from this release.
- **The React entry** widens the support surface (React versions, frameworks). It's mitigated by the lockstep release and the peer range.

## 9. Open questions

1. **Option names:** `radius` / `height` / `theme`, or an `appearance: { … }` object mirroring Stripe.
2. **Compact threshold:** the exact width below which a block button goes logo-led. Measure it from the rendered default, and decide whether the compact form keeps a short word (for example "Split") or shows the logo only.
3. **Events:** an `instanceId` on document events (recommended), versus also dispatching on the button element.
4. **Themes:** ship `light` and `outline` now, or `maroon` only until the hover roles exist in the design system.
5. **React peer range:** `>=18` (proposed), or also 17.
