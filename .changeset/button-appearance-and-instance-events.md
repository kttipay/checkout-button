---
'@maytes/checkout-button': minor
---

`renderButton()` accepts `radius` and `height` so the Split with Maytes button can match an express-checkout row (for example 6px corners at 48px next to Apple Pay and Google Pay); the label no longer wraps. Every `maytes:checkout-*` event now carries `detail.instanceId` and `detail.source` (`'button'` or `'api'`), and each instance exposes `maytes.instanceId`, so pages with several instances can tell their events apart. Existing event fields and the default button are unchanged.
