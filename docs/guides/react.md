# React

Add the Split with Maytes button to a React app (Vite, Create React App, Remix) with a small component that is safe under StrictMode.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The example calls it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

```bash
npm install @maytes/checkout-button
```

```tsx
import { useEffect, useRef } from 'react';
import { Maytes } from '@maytes/checkout-button';

export function SplitWithMaytesButton({ cartId }: { cartId: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const cartIdRef = useRef(cartId);

  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  useEffect(() => {
    const maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: cartIdRef.current }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slotRef.current!, { block: true });
    return () => maytes.destroy();
  }, []);

  return <div ref={slotRef} />;
}
```

- **One instance per mount.** The instance is created in an effect and destroyed in its cleanup. StrictMode mounts effects twice in development; the first instance is destroyed before the second is created, so one button remains.
- **Latest cart, no rebuild.** `createCheckout` runs on click, so it reads `cartIdRef.current` rather than closing over the first render's `cartId`, and the button is not rebuilt when the cart changes.
- **Reacting to the checkout.** To show your own message when the checkout can't open, add a [`maytes:checkout-*` event](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md) listener in another `useEffect` and remove it in the cleanup.
- Using Next.js? See the [Next.js guide](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/nextjs.md).

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
