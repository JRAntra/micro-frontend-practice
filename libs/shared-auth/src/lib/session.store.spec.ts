import { TestBed } from '@angular/core/testing';
import { SessionStore } from './session.store';

/**
 * Ordinary unit tests for an ordinary service.
 *
 * Worth reading alongside step 3, because of what they prove and what they cannot.
 * Angular's injector guarantees one instance per injector, and these tests confirm
 * it — yet the lab's whole third step exists because that guarantee stops at the
 * federation boundary. Two applications each with their own bundled copy of this
 * file each get their own "singleton", and no test in this file can see that.
 *
 * Run with `npm run test:units`.
 */
describe('SessionStore', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('starts signed out', () => {
    const store = TestBed.inject(SessionStore);
    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
  });

  it('signs a user in and back out', () => {
    const store = TestBed.inject(SessionStore);

    store.signIn('Wile E. Coyote');
    expect(store.user()).toBe('Wile E. Coyote');
    expect(store.isSignedIn()).toBe(true);

    store.signOut();
    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
  });

  it('ignores blank names', () => {
    const store = TestBed.inject(SessionStore);
    store.signIn('   ');
    expect(store.isSignedIn()).toBe(false);
  });

  it('trims the name it stores', () => {
    const store = TestBed.inject(SessionStore);
    store.signIn('  Road Runner  ');
    expect(store.user()).toBe('Road Runner');
  });

  it('is one instance per injector', () => {
    expect(TestBed.inject(SessionStore)).toBe(TestBed.inject(SessionStore));
  });

  it('registers its instanceId so the lab dashboard can count copies', () => {
    const store = TestBed.inject(SessionStore);
    const g = globalThis as unknown as { __MF_LAB_SESSION_IDS__?: string[] };
    expect(g.__MF_LAB_SESSION_IDS__).toContain(store.instanceId);
  });

  describe('the basket', () => {
    const anvil = { sku: 'AC-1', name: 'Anvil, 50kg', price: 12900 };
    const skates = { sku: 'AC-2', name: 'Rocket Skates', price: 24900 };

    it('starts empty', () => {
      const store = TestBed.inject(SessionStore);
      expect(store.isEmpty()).toBe(true);
      expect(store.cartCount()).toBe(0);
      expect(store.cartTotal()).toBe(0);
    });

    it('adds a line, then increments it rather than duplicating', () => {
      const store = TestBed.inject(SessionStore);

      store.add(anvil);
      store.add(anvil);
      store.add(skates);

      expect(store.cart().length).toBe(2);
      expect(store.qtyOf('AC-1')).toBe(2);
      expect(store.cartCount()).toBe(3);
      expect(store.cartTotal()).toBe(12900 * 2 + 24900);
    });

    it('ignores a non-positive quantity on add', () => {
      const store = TestBed.inject(SessionStore);
      store.add(anvil, 0);
      store.add(anvil, -3);
      expect(store.isEmpty()).toBe(true);
    });

    it('removes a line when its quantity reaches zero', () => {
      const store = TestBed.inject(SessionStore);
      store.add(anvil, 2);

      store.setQty('AC-1', 1);
      expect(store.qtyOf('AC-1')).toBe(1);

      store.setQty('AC-1', 0);
      expect(store.isEmpty()).toBe(true);
    });

    it('empties the basket on sign-out', () => {
      const store = TestBed.inject(SessionStore);
      store.signIn('Wile E. Coyote');
      store.add(skates, 3);

      store.signOut();

      expect(store.isEmpty()).toBe(true);
      expect(store.isSignedIn()).toBe(false);
    });

    /*
     * The point of the basket living in this library at all.
     *
     * The remote owns the Add-to-basket button; the shell owns the header counter.
     * They are separately built bundles that never import each other, so the ONLY
     * reason a click on one moves the other is that both resolved to this one
     * object. That resolution is decided in the two module-federation.config.ts
     * files — step 3 — and nothing in this file can enforce it.
     */
    it('is a single object, which is what makes cross-application updates possible', () => {
      const asShellWouldSeeIt = TestBed.inject(SessionStore);
      const asRemoteWouldSeeIt = TestBed.inject(SessionStore);

      asRemoteWouldSeeIt.add(skates);

      expect(asShellWouldSeeIt).toBe(asRemoteWouldSeeIt);
      expect(asShellWouldSeeIt.cartCount()).toBe(1);
    });
  });
});
