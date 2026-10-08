---
'@maytes/checkout-button': minor
---

`renderButton()` accepts `radius` and `height` so the Split with Maytes button can match an express-checkout row (for example 6px corners at 48px next to Apple Pay and Google Pay); a button with a `height` keeps its label on one line. Every `maytes:checkout-*` event now carries `detail.instanceId` and `detail.source` (`'button'` or `'api'`), and each instance exposes `maytes.instanceId`, so pages with several instances can tell their events apart. Existing event fields and the default button are unchanged: without `radius`/`height` the button renders exactly as in 1.1. Events that had no `detail` (`opened`, `closed`) now carry `{ instanceId, source }`. TypeScript code that hand-builds a `MaytesSDK` object needs the new `instanceId` member.
