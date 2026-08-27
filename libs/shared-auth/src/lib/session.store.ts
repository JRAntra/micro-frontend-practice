import { Injectable, computed, signal } from '@angular/core';

/** One line in the basket. The remote adds them; the shell's header counts them. */
export interface CartLine {
  sku: string;
  name: string;
  /** In cents. */
  price: number;
  qty: number;
}

/**
 * The session: who is signed in, and what is in their basket. Shared between the
 * shell and every remote.
 *
 * This is an ordinary root-provided Angular service. Nothing about it knows or
 * cares about Module Federation — which is exactly the point of the lab. Whether
 * the shell and the remote end up talking to ONE of these or to TWO separate
 * copies is decided entirely by the `shared` configuration in the two
 * module-federation.config.ts files, not by anything written here.
 *
 * The basket is here rather than in either application because it is the clearest
 * demonstration of what step 3 is about: the **remote** owns the Add-to-basket
 * button, the **shell** owns the basket indicator in the header. Those two live in
 * separately built bundles. If the store is genuinely shared, clicking one updates
 * the other instantly; if each application bundled its own copy, the button works,
 * the header never moves, and nothing anywhere reports an error.
 *
 * Nothing here is persisted, and that is a decision rather than an omission. A real
 * storefront would keep the basket in `sessionStorage` — but two separate copies of
 * this store would then both hydrate from the same key, show the same basket after
 * every reload, and quietly launder exactly the bug step 3 exists to teach. Keeping
 * the state in memory means a duplicated store stays visibly duplicated.
 *
 * See TOUR.md → "libs/shared-auth" and step 3 of the guide.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  /** Null when nobody is signed in. */
  private readonly _user = signal<string | null>(null);
  private readonly _cart = signal<CartLine[]>([]);

  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._user() !== null);

  readonly cart = this._cart.asReadonly();
  readonly cartCount = computed(() =>
    this._cart().reduce((n, l) => n + l.qty, 0)
  );
  readonly cartTotal = computed(() =>
    this._cart().reduce((n, l) => n + l.qty * l.price, 0)
  );
  readonly isEmpty = computed(() => this._cart().length === 0);

  /**
   * A marker so the lab can tell two copies of this service apart at runtime.
   * If the shell and the remote are sharing one singleton they observe the same
   * instanceId; if they each bundled their own copy, the ids differ.
   */
  readonly instanceId = Math.random().toString(36).slice(2, 10);

  constructor() {
    /*
     * Lab instrumentation, and the only thing in this file that exists for the
     * lab rather than for the application.
     *
     * Each *copy* of this class that gets constructed pushes its id onto one
     * global list. That makes the step 3 question directly countable: one entry
     * means the shell and the remote share a single store, two entries mean they
     * each bundled their own. The dashboard at /lab reads this list.
     *
     * A plain global rather than an import, deliberately: importing a lab helper
     * here would make this library depend on the dashboard, and this library is
     * the one being shared across the federation boundary.
     */
    const g = globalThis as unknown as { __MF_LAB_SESSION_IDS__?: string[] };
    (g.__MF_LAB_SESSION_IDS__ ??= []).push(this.instanceId);
  }

  signIn(name: string): void {
    const trimmed = name.trim();
    if (trimmed) this._user.set(trimmed);
  }

  signOut(): void {
    this._user.set(null);
    this._cart.set([]);
  }

  add(item: Omit<CartLine, 'qty'>, qty = 1): void {
    if (qty < 1) return;
    this._cart.update((lines) => {
      const at = lines.findIndex((l) => l.sku === item.sku);
      if (at === -1) return [...lines, { ...item, qty }];
      return lines.map((l, i) => (i === at ? { ...l, qty: l.qty + qty } : l));
    });
  }

  setQty(sku: string, qty: number): void {
    if (qty <= 0) {
      this.remove(sku);
      return;
    }
    this._cart.update((lines) =>
      lines.map((l) => (l.sku === sku ? { ...l, qty } : l))
    );
  }

  remove(sku: string): void {
    this._cart.update((lines) => lines.filter((l) => l.sku !== sku));
  }

  clear(): void {
    this._cart.set([]);
  }

  /** How many of one SKU are in the basket. Used by the remote's product cards. */
  qtyOf(sku: string): number {
    return this._cart().find((l) => l.sku === sku)?.qty ?? 0;
  }
}
