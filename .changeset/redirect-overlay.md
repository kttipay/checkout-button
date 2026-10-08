---
'@maytes/checkout-button': minor
---

Add an opt-in `redirectOverlay` option to `renderButton()` and `openCheckout()`: when the checkout opens in the same tab (redirect mode, phones, blocked popups), the Maytes loading overlay shows while the checkout is created and clears itself after a back-button return. Off by default, so existing integrations are unchanged.
