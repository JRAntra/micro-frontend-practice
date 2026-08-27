import { TestBed } from '@angular/core/testing';
import { SessionStore } from '@mf-lab/shared-auth';
import { PRODUCTS } from '../catalogue';
import { ProductCardComponent } from './product-card.component';

/**
 * The component step 4 federates, tested the ordinary way.
 *
 * The point of having this here: nothing about this component is special. It has no
 * federation code in it, no lifecycle hook that knows it might be loaded by another
 * application, no configuration. It is a plain standalone component, and what makes
 * it federatable is one line in `module-federation.config.ts`.
 *
 * Run with `npm run test:units`.
 */
describe('ProductCardComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [ProductCardComponent] })
  );

  it('renders the catalogue featured item when given no input', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="product-card"]')).not.toBeNull();
    expect(el.textContent).toContain('Rocket Skates');
    expect(
      el
        .querySelector('[data-testid="product-card-price"]')
        ?.textContent?.trim()
    ).toBe('$249.00');
  });

  it('renders whichever product it is handed', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput(
      'product',
      PRODUCTS.find((p) => p.sku === 'AC-4')
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Portable Hole'
    );
  });

  it('adds to the shared basket, and reflects what is already in it', () => {
    const session = TestBed.inject(SessionStore);
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.detectChanges();

    const button = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[data-testid="product-card-add"]');
    button?.click();
    fixture.detectChanges();

    expect(session.cartCount()).toBe(1);
    expect(session.qtyOf('AC-2')).toBe(1);
    expect(button?.textContent).toContain('In basket');
  });

  it('will not sell what it does not have', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    // AC-3 is the out-of-stock fixture in the catalogue.
    fixture.componentRef.setInput(
      'product',
      PRODUCTS.find((p) => p.sku === 'AC-3')
    );
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Out of stock');
    expect(
      el.querySelector<HTMLButtonElement>('[data-testid="product-card-add"]')
        ?.disabled
    ).toBe(true);
  });
});
