import { TestBed } from '@angular/core/testing';
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

  it('renders the featured product name and price', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="product-card"]')).not.toBeNull();
    expect(el.textContent).toContain('Rocket Skates');
    expect(
      el.querySelector('[data-testid="product-card-price"]')?.textContent
    ).toBe('$249');
  });
});
