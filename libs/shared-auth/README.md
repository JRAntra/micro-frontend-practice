# shared-auth

The session: who is signed in, and what is in their basket. Imported by both `apps/shell` and
`apps/products`.

`SessionStore` is an ordinary root-provided Angular service — nothing in it knows about Module
Federation. Whether the two applications end up talking to **one** of these or to **two** separate
copies is decided entirely by the `shared` callbacks in the two `module-federation.config.ts` files.
That is the subject of [step 3](../../guide/03-share-state-as-a-singleton.md), and
`TOUR.md` → **`libs/shared-auth` — an ordinary library with a sharp edge** explains the sharp edge.

The store deliberately keeps its state in memory rather than `sessionStorage`, so that a duplicated
store stays visibly duplicated. It also stamps each constructed copy onto
`globalThis.__MF_LAB_SESSION_IDS__`, which is how the `/lab` dashboard counts instances.

```bash
nx test shared-auth
```
