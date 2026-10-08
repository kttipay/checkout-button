# Angular

Add the Split with Maytes button to an Angular app with a standalone component that also works with Angular's server-side rendering.

You need an endpoint on your server that creates a Maytes checkout and returns `{ checkoutId, checkoutUrl }`. The example calls it `POST /api/maytes/checkout`; [Your server](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/server.md) shows how to build it.

```bash
npm install @maytes/checkout-button
```

```ts
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Maytes, type MaytesSDK } from '@maytes/checkout-button';

@Component({
  selector: 'app-split-with-maytes',
  standalone: true,
  template: '<div #slot></div>',
})
export class SplitWithMaytesComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) cartId!: string;
  @ViewChild('slot', { static: true }) slot!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private maytes: MaytesSDK | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.maytes = Maytes({
      environment: 'sandbox',
      createCheckout: async () => {
        const res = await fetch('/api/maytes/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cartId: this.cartId }),
        });
        if (!res.ok) throw new Error('Could not create the Maytes checkout');
        return res.json(); // { checkoutId, checkoutUrl }
      },
    });
    this.maytes.renderButton(this.slot.nativeElement, { block: true });
  }

  ngOnDestroy(): void {
    this.maytes?.destroy();
  }
}
```

- The `isPlatformBrowser` check keeps the button out of server-side rendering; without SSR it is always true.
- `this.cartId` is read when the shopper clicks, so it is always the latest value.

Prefer a standard custom element? [`<maytes-checkout-button>`](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/web-component.md) works here too.

Next: [API reference](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/api.md) · [Troubleshooting](https://github.com/kttipay/maytes-checkout-button/blob/main/docs/guides/troubleshooting.md)
