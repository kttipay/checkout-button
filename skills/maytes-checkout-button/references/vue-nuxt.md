# Vue 3 and Nuxt 3

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Maytes, type MaytesSDK } from '@maytes/checkout-button';

const props = defineProps<{ cartId: string }>();
const slot = ref<HTMLDivElement | null>(null);
let maytes: MaytesSDK | null = null;

onMounted(() => {
  maytes = Maytes({
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
  maytes.renderButton(slot.value!, { block: true });
});

onBeforeUnmount(() => maytes?.destroy());
</script>

<template>
  <div ref="slot" />
</template>
```

- `props.cartId` is read at click time, so it is always current.
- **Nuxt 3:** use the same component. `onMounted` only runs in the browser. Save it as `components/SplitWithMaytesButton.client.vue` or wrap it in `<ClientOnly>`. Put the server half in `server/api/maytes/checkout.post.ts` ([server.md](server.md)).
