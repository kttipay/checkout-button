# Solid and SolidStart

```tsx
import { onCleanup, onMount } from 'solid-js';
import { Maytes } from '@maytes/checkout-button';

export function SplitWithMaytesButton(props: { cartId: string }) {
  let slot!: HTMLDivElement;

  onMount(() => {
    const maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: props.cartId }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slot, { block: true });
    onCleanup(() => maytes.destroy());
  });

  return <div ref={slot} />;
}
```

- `onMount` only runs in the browser, so this also works with SolidStart's server rendering.
- `props.cartId` is read at click time.
