# Vue 3 and Nuxt 3

Add the Split with Maytes button to a Vue 3 or Nuxt 3 app with one single-file component.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The example calls it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

```bash
npm install @maytes/checkout-button
```

## Vue 3

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

`props.cartId` is read when the shopper clicks, so it is always the latest value.

## Nuxt 3

Use the Vue 3 component as it is. `onMounted` only runs in the browser and the package doesn't touch `window` when it's imported, so server rendering is safe. Save it as `components/SplitWithMaytesButton.client.vue` (the `.client` suffix renders it only in the browser), or wrap it in `<ClientOnly>`:

```vue
<template>
  <ClientOnly>
    <SplitWithMaytesButton :cart-id="cart.id" />
  </ClientOnly>
</template>
```

Put the server half in a server route such as `server/api/maytes/checkout.post.ts`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows what it must return.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
