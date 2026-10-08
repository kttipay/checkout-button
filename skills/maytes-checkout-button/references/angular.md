# Angular

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

- `isPlatformBrowser` keeps the button out of Angular SSR; without SSR it is always true.
- `this.cartId` is read at click time.
