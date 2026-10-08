# React

For React apps (Vite, Create React App, Remix). For Next.js, read [nextjs.md](nextjs.md).

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

- The empty dependency array plus the cleanup make it StrictMode-safe: one button in development.
- `cartIdRef` gives `createCheckout` the latest cart without rebuilding the button.
- Listen to `maytes:checkout-failed` in another `useEffect` (and remove the listener in its cleanup) to show your own error message.
