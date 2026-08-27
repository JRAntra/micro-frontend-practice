import { Injectable, computed, signal } from '@angular/core';

/**
 * The signed-in user, shared between the shell and every remote.
 *
 * This is an ordinary root-provided Angular service. Nothing about it knows or
 * cares about Module Federation — which is exactly the point of the lab. Whether
 * the shell and the remote end up talking to ONE of these or to TWO separate
 * copies is decided entirely by the `shared` configuration in the two
 * module-federation.config.ts files, not by anything written here.
 *
 * See TOUR.md → "libs/shared-auth" and step 3 of the guide.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  /** Null when nobody is signed in. */
  private readonly _user = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._user() !== null);

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
  }
}
