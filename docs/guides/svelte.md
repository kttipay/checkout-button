# Svelte and SvelteKit

Add the Split with Maytes button to a Svelte or SvelteKit app with one component.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The example calls it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

```bash
npm install @maytes/checkout-button
```

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Maytes } from '@maytes/checkout-button';

  let { cartId }: { cartId: string } = $props();
  let slot: HTMLDivElement;

  onMount(() => {
    const maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    maytes.renderButton(slot, { block: true });
    return () => maytes.destroy();
  });
</script>

<div bind:this={slot}></div>
```

- This is Svelte 5. On Svelte 4, replace the `$props()` line with `export let cartId: string;`.
- `onMount` only runs in the browser, so the component works in SvelteKit pages as it is. The function it returns runs when the component is destroyed.
- Put the server half in `src/routes/api/maytes/checkout/+server.ts`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows what it must return.

Prefer a standard custom element? [`<maytes-checkout-button>`](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/web-component.md) works here too.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
