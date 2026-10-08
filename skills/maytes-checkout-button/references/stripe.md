# Checkouts that use Stripe's Payment Element

Two supported shapes; the guide for the first is https://developers.maytes.co/stripe.

1. **Split with Maytes inside the Payment Element.** Add the Maytes custom payment method (`customPaymentMethods` with the `cpmt_` id for the Stripe account's mode) to `stripe.elements({ mode: 'payment', amount, currency, … })` in deferred mode. When `elements.submit()` resolves with `selectedPaymentMethod` equal to that id, call the merchant's endpoint ([server.md](server.md)) and send the shopper to the returned `checkoutUrl` with `window.location.assign`. Never call `stripe.confirmPayment()` on that branch: there is no PaymentIntent.
2. **The Maytes button beside the Stripe form.** Render it with `renderButton` exactly as for the page's stack; it is independent of Stripe.

Notes:

- The `cpmt_` id only appears in the Payment Element for the publishable key of the Stripe account that owns it. A mismatched key shows no Maytes option and no error.
- Card payments keep using Stripe; only the Maytes branch goes through the merchant's Maytes endpoint and webhook.
