# Svelte and SvelteKit

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

- Svelte 5 syntax. On Svelte 4, replace the `$props()` line with `export let cartId: string;`.
- `onMount` only runs in the browser and its returned function runs on destroy, so this works in SvelteKit as it is. Server half: `src/routes/api/maytes/checkout/+server.ts` ([server.md](server.md)).
