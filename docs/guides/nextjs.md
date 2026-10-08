# Next.js

Add the Split with Maytes button to a Next.js app with a client component, and keep your Maytes credentials in a Route Handler.

```bash
npm install @maytes/checkout-button
```

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

- **Server rendering is safe.** The package doesn't touch `window` when it's imported, and the button is created in `useEffect`, which only runs in the browser.
- **The server half** goes in a Route Handler, `app/api/maytes/checkout/route.ts`, so your Maytes credentials never reach the browser. [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows what it must return.
- **Prefer the CDN?** Load it with `next/script` (`<Script src="https://js.maytes.co/v1/checkout-button.js" strategy="afterInteractive" onReady={…} />`) and call `window.Maytes(…)` in `onReady` instead of importing.
- The component follows the [React guide](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/react.md): one instance per mount, StrictMode-safe, the latest cart read through a ref.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
