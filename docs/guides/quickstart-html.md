# Quickstart: plain HTML

Add the Split with Maytes button to any page with a `<script>` tag: server-rendered HTML, PHP, Rails, Django, Laravel, WordPress or any page without a bundler.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The examples call it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

```html
<div id="maytes-button"></div>

<script src="https://js.maytes.co/v1/checkout-button.js" crossorigin="anonymous"></script>
<script>
  const maytes = window.Maytes({
    environment: 'sandbox',
    createCheckout: async () => {
      const res = await fetch('/api/maytes/checkout', { method: 'POST' });
      if (!res.ok) throw new Error('Could not create the Maytes checkout');
      return res.json(); // { checkoutId, checkoutUrl }
    },
  });

  maytes.renderButton(document.getElementById('maytes-button'), { block: true });
</script>
```

- The second script must run after the first, so keep them in this order, both without `async`.
- Use `environment: 'sandbox'` with sandbox API credentials while you test, and `'production'` with production credentials when you go live.
- `https://js.maytes.co/v1/checkout-button.js` always serves the newest `1.x` release. To freeze on a tested build with SRI, use a pinned URL from [Install and versioning](https://github.com/kttipay/maytes-checkout-button#install).

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Events](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/events.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
