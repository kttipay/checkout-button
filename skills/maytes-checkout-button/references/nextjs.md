# Next.js

Use a client component for the button and a Route Handler for the server half.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Maytes } from '@maytes/checkout-button';

export default function SplitWithMaytesButton({ cartId }: { cartId: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const cartIdRef = useRef(cartId);

  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  useEffect(() => {
    const maytes = Maytes({
      environment: process.env.NEXT_PUBLIC_MAYTES_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
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

- Importing the package during server rendering is safe; the instance is created in `useEffect`, which only runs in the browser.
- Put the server half in `app/api/maytes/checkout/route.ts` ([server.md](server.md)). Only the environment name may be `NEXT_PUBLIC_`; the client id and secret must not.
- CDN alternative: `next/script` with `strategy="afterInteractive"` and call `window.Maytes(…)` in `onReady`.
