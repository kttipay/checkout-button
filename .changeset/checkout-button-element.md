---
'@maytes/checkout-button': minor
---

Add `<maytes-checkout-button>`, a standard custom element for any front-end stack (plain HTML, Vue/Nuxt, Angular, Svelte/SvelteKit, Solid, React 19). Import `@maytes/checkout-button/element` or load `https://js.maytes.co/v1/checkout-button.element.js`; set `environment` and the other options as attributes and `createCheckout` as a property, and listen for `maytes-opened`, `maytes-closed`, `maytes-redirected` and `maytes-failed` on the element. `open()` starts the checkout from your own button. Configuration mistakes arrive as `maytes-failed` with `reason: 'config'` instead of throwing. `checkout-button.js`, `.mjs` and `.cjs` are unchanged.
