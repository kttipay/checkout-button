# The merchant's server

The endpoint behind `createCheckout`, the webhook and capture. Every stack needs this part.

## Contract with the browser

Return exactly:

```json
{ "checkoutId": "<checkout_uuid from the API>", "checkoutUrl": "<checkout_url from the API>" }
```

- Map the merchant API's snake_case `checkout_uuid` / `checkout_url` to `checkoutId` / `checkoutUrl`. Any other shape makes the button dispatch `maytes:checkout-failed` with reason `invalid-shape`.
- Accept a cart or order reference from the browser and price it from the merchant's own catalogue.
- Keep the Maytes client id and secret in server-only environment variables.

## Node.js (Express) with the Maytes backend SDK

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
  const cart = await loadCart(req.body.cartId);
  const merchantOrderId = await createPendingOrder(cart);

  const created = await maytesApi.createCheckout({
    createCheckoutRequest: {
      merchantOrderId,
      totalAmount: cart.total,              // minor units: 4500 = AUD 45.00
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

Backend SDKs for Python, PHP, Go, Java, Ruby and .NET: https://developers.maytes.co/build-your-integration. Field reference: https://developers.maytes.co/create-checkout.

Framework locations: Next.js `app/api/maytes/checkout/route.ts`, Nuxt `server/api/maytes/checkout.post.ts`, SvelteKit `src/routes/api/maytes/checkout/+server.ts`.

## Webhook and capture

- Subscribe a separate route to `checkout.authorized` and verify the `X-Maytes-Signature` header: https://developers.maytes.co/webhooks
- Capture within 2 minutes of `checkout.authorized`, or the hold is voided. A successful capture is the "order paid" signal: https://developers.maytes.co/capture-and-status
- Keep Maytes and Stripe webhooks on separate routes; they use different signing schemes.
