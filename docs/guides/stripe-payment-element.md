# With Stripe's Payment Element

How Split with Maytes fits a checkout that already uses Stripe's Payment Element.

If your checkout already uses Stripe's Payment Element, you can offer Split with Maytes inside it as a Stripe custom payment method. The full guide is at [developers.maytes.co/stripe](https://developers.maytes.co/stripe):

1. The Payment Element shows Split with Maytes beside cards and wallets.
2. When the shopper pays, `elements.submit()` tells you Split with Maytes was picked.
3. Your server creates the Maytes checkout (see [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md)), and your page sends the shopper to the `checkoutUrl` it returns, or calls `maytes.openCheckout()` from your Pay button to open it in a popup (see [Using your own button](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/own-button.md)).
4. Your webhook captures on `checkout.authorized`. There is no Stripe PaymentIntent or Stripe fee for that order.

You can also place this button beside the Stripe form, for example in an express-checkout row next to wallet buttons. It works the same as on any other page: follow the quickstart for your stack.

Next: [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md)
