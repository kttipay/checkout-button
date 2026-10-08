# Solid

Add the Split with Maytes button to a Solid or SolidStart app with one component.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The example calls it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

```bash
npm install @maytes/checkout-button
```

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

- `onMount` only runs in the browser, so the component also works with SolidStart's server rendering.
- `props.cartId` is read when the shopper clicks, so it is always the latest value.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
