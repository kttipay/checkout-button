---
'@maytes/checkout-button': minor
---

Add `openCheckout({ mode })` to start the Maytes checkout from the merchant's own button, with the same popup, loader, overlay, events and fallbacks as the rendered button. It resolves with the launch result (`popup`, `redirected`, `failed`, `closed` or `ignored`) and never rejects.

No change for existing integrations: the rendered button looks and behaves exactly as before. TypeScript code that builds its own `MaytesSDK` object (for example a test fake) needs the new `openCheckout` member.
