# Your server

What the endpoint behind `createCheckout` must do and return, in any backend language, with a Node.js example.

The button never holds your Maytes credentials. Your page calls your own endpoint; your endpoint creates the checkout with the [Maytes merchant API](https://developers.maytes.co/create-checkout) and returns two fields:

```json
{ "checkoutId": "019fbb9e-ecd1-7059-99f3-f8bf47b63931", "checkoutUrl": "https://sandbox-checkout.maytes.co/?id=019fbb9e-ecd1-7059-99f3-f8bf47b63931" }
```

- `checkoutId` is required. `checkoutUrl` is optional, but return it: the button then opens exactly the URL Maytes gave you.
- The merchant API answers in snake_case (`checkout_uuid`, `checkout_url`). Map them to `checkoutId` and `checkoutUrl`; anything else makes the button report `invalid-shape`.
- Price the cart on your server. Send a cart or order reference from the browser, never a total.

## Node.js example

Express with the Maytes backend SDK (`npm install @maytes/api-client-js`). SDKs for Python, PHP, Go, Java, Ruby and .NET are listed in [Build your integration](https://developers.maytes.co/build-your-integration).

```ts
import express from 'express';
import { createMaytesApiClient } from '@maytes/api-client-js';

const maytesApi = createMaytesApiClient({
  endpoint: 'https://sandbox-api.maytes.co',   // https://api.maytes.co in production
  clientId: process.env.MAYTES_CLIENT_ID!,
  clientSecret: process.env.MAYTES_CLIENT_SECRET!,
});

const app = express();
app.use(express.json());

app.post('/api/maytes/checkout', async (req, res) => {
  const cart = await loadCart(req.body.cartId);                // your catalogue, your prices
  const merchantOrderId = await createPendingOrder(cart);

  const created = await maytesApi.createCheckout({
    createCheckoutRequest: {
      merchantOrderId,
      totalAmount: cart.total,                                 // minor units: 4500 = AUD 45.00
      currency: 'AUD',
      returnUrl: `https://shop.example.com/thanks?order=${merchantOrderId}`,
      cancelUrl: 'https://shop.example.com/cart',
      items: cart.lines.map((line) => ({
        itemRef: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        currency: 'AUD',
        category: 'other',
      })),
    },
  });

  await saveCheckoutId(merchantOrderId, created.data.checkoutUuid);
  res.json({ checkoutId: created.data.checkoutUuid, checkoutUrl: created.data.checkoutUrl });
});
```

## Taking the money

The button only opens the checkout. Your server finishes the payment:

- [Webhooks](https://developers.maytes.co/webhooks): subscribe to `checkout.authorized` and verify the `X-Maytes-Signature` header.
- [Capture and checkout status](https://developers.maytes.co/capture-and-status): capture within 2 minutes of `checkout.authorized`, or the hold is voided. A successful capture is your "order paid" signal.
- The shopper comes back to the `return_url` you set. In popup mode the checkout sends your page there and closes the popup.

## Environments

| Browser `environment` | Hosted checkout | Merchant API |
|---|---|---|
| `'sandbox'` | `https://sandbox-checkout.maytes.co` | `https://sandbox-api.maytes.co` |
| `'production'` | `https://checkout.maytes.co` | `https://api.maytes.co` |

Sandbox credentials only work against the sandbox API. Keep the browser's `environment` on the same side as the credentials your server uses.

Next: [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md) · [Security and CSP](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/security-csp.md)
