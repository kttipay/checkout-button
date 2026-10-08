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

## React bindings

The package also ships React components at `@maytes/checkout-button/react`. They do the same as the component above, without writing it yourself:

```tsx
import { MaytesProvider, MaytesButton } from '@maytes/checkout-button/react';

export function Checkout({ cartId }: { cartId: string }) {
  return (
    <MaytesProvider environment="sandbox" createCheckout={() => createCheckoutOnYourServer(cartId)}>
      <MaytesButton block mode="popup" onFailed={(detail) => showMessage(detail.reason)} />
    </MaytesProvider>
  );
}
```

`MaytesButton` takes the same options as `renderButton()` (`mode`, `label`, `block`, `radius`, `height`) plus `onOpened`, `onClosed`, `onRedirected` and `onFailed`. The callbacks fire only for launches started by a `MaytesButton` under the same provider.

From your own button, for example a Stripe Payment Element where Split with Maytes is a custom payment method:

```tsx
import { useMaytes } from '@maytes/checkout-button/react';

export function PayButton({ maytesSelected }: { maytesSelected: boolean }) {
  const { openCheckout, busy } = useMaytes();
  return (
    <button disabled={busy} onClick={() => (maytesSelected ? openCheckout() : payWithStripe())}>
      Pay
    </button>
  );
}
```

Track `maytesSelected` from the Payment Element's `change` event (`event.value.type === '<your cpmt_ id>'`) and call `openCheckout()` inside the click, before any `await`, so the popup isn't blocked.

- `createCheckout` can change on every render; the provider always calls the latest one and never re-creates the SDK. Changing `environment` replaces the instance.
- Works with React 18 and 19, StrictMode and server rendering (Next.js); the entry is marked `"use client"`.
- React is an optional peer dependency: the core and the CDN script don't include it.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
