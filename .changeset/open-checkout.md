---
'@maytes/checkout-button': minor
---

Add `openCheckout({ mode })` to start the Maytes checkout from the merchant's own button, with the same popup, loader, overlay, events and fallbacks as the rendered button. It resolves with the launch result (`popup`, `redirected`, `failed`, `closed` or `ignored`) and never rejects. Every button on an instance now shows the busy state while any launch on that instance is in flight.
