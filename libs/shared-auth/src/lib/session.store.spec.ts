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
});
