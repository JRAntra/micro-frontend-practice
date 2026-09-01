# A guided tour of the configuration

Everything interesting about a federated system lives in build configuration. This file walks
through each config file in the workspace and explains what its keys actually do — including
the ones you will not touch, because knowing why they exist is half of understanding the setup.

Read it once end to end before starting, then come back to individual sections as the hints
point you at them.

---

## The one-minute version

Module Federation adds exactly two ideas to webpack:

1. **A container.** A build can publish some of its modules under a name. The published set is
   its `exposes` map, and the published artifact is `remoteEntry.mjs`.
2. **A share scope.** Several containers loaded into one page can agree to use _one_ copy of a
   dependency instead of each bringing their own. That agreement is the `shared` config.

Almost every problem in this lab is one of those two ideas being half-configured: something is
published but not consumed, or consumed but not shared.

---

## `apps/products/module-federation.config.ts` — the remote's contract

```ts
const config: ModuleFederationConfig = {
  name: 'products',
  exposes: { './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts' },
  shared: (name, sharedConfig) => …,
};
```

**`name`** — the container's name. This string is half of every federated import specifier:
`import('products/Routes')` means "ask the container called `products` for its `./Routes`".
It must match what the host puts in `remotes`.

**`exposes`** — the remote's public API, and the most important key in the file. A remote is a
black box: the _only_ modules the outside world can import are the keys listed here. Everything
else stays private no matter how it is exported in TypeScript.

- The **key** is the specifier consumers use, after the remote name. `'./Routes'` is what makes
  `import('products/Routes')` resolvable.
- The **value** is the file in _this_ project to bundle as that entry point.
- What sits behind a key is up to you: routes, a single component, a service, a plain function.
  Route-level federation (`./Routes`) hands over a whole page. Component-level federation
  (`./ProductCard`) hands over one widget into a page the host still controls.

> **Gotcha:** the file you expose must be part of this app's TypeScript compilation. If nothing
> inside `apps/products` references it, the Angular compiler rejects it with _"is missing from
> the TypeScript compilation"_. That is why `ProductCardComponent` is also used by the remote's
> own page.

**`shared`** — a callback invoked once per shareable dependency, letting you override how (or
whether) it is shared. Return the config to accept it, a modified object to change the policy,
or `false` to remove it from the share scope entirely. See "The share scope" below.

## `apps/shell/module-federation.config.ts` — the host's contract

**`remotes`** — every remote this host may load. This is what makes federation happen at all:
until a remote is declared here, webpack has no reason to treat `products/Routes` as a
container lookup, and will try to resolve it as an ordinary module on disk.

A bare string (`'products'`) means "a project in this workspace with that name". Nx then looks
up that project's **serve port** and bakes `http://localhost:<port>/remoteEntry.mjs` into the
build. Two consequences worth knowing:

- The remote's URL comes from `targets.serve.options.port` in `apps/products/project.json`
  (4272 here). `publicHost` is _not_ used for this; only the port is.
- The URL is baked in **at build time**. Deploying the same bundle to staging and production
  means the remote URL is fixed at build time too — which is the main argument for _dynamic_
  federation in real systems (see "Blast radius").

For a remote outside the workspace you would use the tuple form,
`remotes: [['name', 'https://host/remoteEntry.mjs']]`, and add a `remotes.d.ts` so TypeScript
stops complaining about a module it cannot find.

## `apps/*/webpack.config.ts` — where it is switched on

```ts
export default withModuleFederation(config, { dts: false });
```

One line, and you will not need to change it. `withModuleFederation` reads the config next door
and installs webpack's `ModuleFederationPlugin` with the right defaults for Angular.

Two notes for when you search the web about this:

- In Nx 20 the helper comes from **`@nx/module-federation/angular`**. Most search results and
  older tutorials still show `@nx/angular/module-federation`, which is the previous location.
- There is a separate `webpack.prod.config.ts`. Nothing in this lab requires touching it.

## `tsconfig.base.json` — the workspace module map

```json
"paths": {
  "@mf-lab/shared-auth":  ["libs/shared-auth/src/index.ts"],
  "products/Routes":      ["apps/products/src/app/remote-entry/entry.routes.ts"],
  "products/ProductCard": ["apps/products/src/app/remote-entry/product-card.component.ts"]
}
```

The first entry is ordinary Nx: an import alias for a workspace library.

The other two are subtler and worth understanding properly. `products/Routes` has no file on
disk at runtime — it is resolved by _webpack_, from a container, over the network. But
**TypeScript** still has to type-check the import, and TypeScript knows nothing about
federation. These mappings exist purely so `tsc` can find _a_ declaration for the specifier.

That split causes a trap you should know about: if the host does **not** declare the remote,
webpack falls back to this path mapping and quietly compiles the component straight into the
host's own bundle. The page looks right and no federation happened at all. "It renders" is not
evidence that federation works — which is why the `/lab` dashboard's step 2 check looks for an
actual `remoteEntry.mjs` request from the remote's origin instead of trusting the render, and why
`npm run serve:dist` (two separate origins, no path mappings) is worth running before you believe
a step is done.

## `nx.json` — task orchestration, not federation

Caching and task dependencies. `"dependsOn": ["^build"]` is why building the shell builds the
remote first. Nothing federation-specific; you will not edit it.

Locally you want Nx's defaults: the daemon on, and the cache in `.nx/cache` (gitignored, and
`npm run clean` removes it). Two environment variables show up in containerised runs and are
worth recognising rather than setting: `NX_CACHE_DIRECTORY`, for when `node_modules` is mounted
read-only so Nx cannot cache beside it, and `NX_DAEMON=false`, for when there is no long-lived
process to talk to.

A third one, `NX_MF_DEV_REMOTES`, appears in this file under
`targetDefaults["@nx/angular:webpack-browser"].inputs`. Do not set it. Nx _writes_ it, and it is
listed there only as a cache key, so that switching how the remotes are served correctly
invalidates the host's build. Exporting a stale value by hand silently poisons the build hash.

## `package.json` — one dependency install, and one pin worth reading

This is an Nx **integrated** monorepo: a single root `package.json`, no npm workspaces, no
per-app manifests. That is deliberate, and it is why there is one `npm ci` for the whole
workspace and no install to run inside `apps/shell`.

```json
"overrides": { "@rspack/core": "1.3.15" }
```

That pin is load-bearing. `@nx/module-federation@20.8.4` depends on `@rspack/core: ^1.1.5`,
and the newest 1.x drops an internal API the bundled Module Federation plugin still calls, so
`withModuleFederation` dies with `compiler.__internal__registerBuiltinPlugin is not a function`.
Caret ranges in a transitive dependency, nothing more — but a genuinely confusing hour if you
hit it without knowing.

## `libs/shared-auth` — an ordinary library with a sharp edge

`SessionStore` is a plain root-provided Angular service holding a signal. Nothing in it knows
about federation.

That is exactly the point. Whether the shell and the remote end up talking to _one_ of these or
to _two separate copies_ is decided entirely by the `shared` configuration in the two
federation configs — not by anything in the library. It also prints an `instanceId`, so you can
tell two copies apart at runtime.

---

## The share scope

When several containers are loaded into one page, each could bring its own copy of Angular,
RxJS, and your libraries. The share scope is the negotiation that prevents that.

**Nx shares a lot for you already.** Every `@angular/*` package the apps use is shared as a
singleton, with `requiredVersion` taken from the root manifest — and, less obviously, so are
**workspace libraries** like `@mf-lab/shared-auth`. You get correct behaviour by default; the
failures in this lab come from configuration that actively opts _out_.

Three flags do the work:

| Flag                  | Meaning                                                  | When it matters                                                                           |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| _(shared at all)_     | "we can reuse a copy if versions are compatible"         | Not sharing = a private copy per bundle. Fine for pure functions, catastrophic for state. |
| `singleton: true`     | "there must never be more than one of these in the page" | Anything holding state, and any framework.                                                |
| `strictVersion: true` | "a version mismatch is an error, not a warning"          | Turns a silent runtime fallback into a loud failure at load time.                         |

The `singleton` distinction is the one people miss. Plain sharing is an optimisation; singleton
is a _correctness_ requirement. Two copies of a store are two different sets of values, and
nothing warns you — the build is green and the console is clean.

`strictVersion` is about _when_ you find out. Without it, incompatible versions cause Module
Federation to quietly load a second copy; with it, you get an error on the deploy that caused
it rather than a mysterious injector bug three sprints later.

### Why Angular in particular must be a singleton

Angular keeps process-wide state: the injector, the current change-detection context. Two
copies in one page means a component compiled against copy A running inside copy B's injector,
and Angular's response is to stop working — `NG0203` (_inject() must be called from an
injection context_) is the classic symptom.

If you want to see it: un-share `@angular/*` in both configs and rebuild. The remote does not
merely get slower or duplicated — the Products page stops rendering entirely. Put it back
afterwards; the lab's required steps depend on it.

---

## Two front doors

`apps/products` has two route files, which looks like duplication and is not:

- **`remote-entry/entry.routes.ts`** — what the _shell_ gets. It is the file behind the
  `'./Routes'` key, so this is the federated entry point.
- **`app/app.routes.ts`** — the remote's own root route table, used when a browser loads the
  products app directly.

Why both? Because a remote is an _application_, not a library. The products team has to be able
to run, test and demo their own product without booting the shell — that independence was the
whole argument for making it a separate deployment. A remote that only works when embedded has
quietly become part of a distributed monolith.

In this scaffold Nx bootstraps `RemoteEntryComponent` **directly** (see
`apps/products/src/bootstrap.ts`), so the standalone app currently renders without consulting
the router at all, and `app.routes.ts` is effectively unused. It becomes load-bearing the moment
the remote grows a second page — and when it does, it should _point at_ the federated entry
rather than list its own components, so there is one definition of what Products is.

---

## Blast radius

Worth doing by hand, and the subject of a `DESIGN.md` question.

Make the remote go away, then load the host. Either of these does it:

```bash
# 1. Against the dev servers — the quick version.
#    Ctrl+C the terminal running `npm run start:remote` (or `start:remote:watch`),
#    then reload http://localhost:4271.

# 2. Against the built output — closer to a failed deploy.
npm run build
npm run serve:dist                                   # in one terminal
mv dist/apps/products/remoteEntry.mjs /tmp/          # in another, then reload the shell
```

The second one has one wrinkle worth knowing: `tools/serve-dist.ts` falls back to `index.html`
for any missing path, so the removed container answers `200 text/html` rather than `404`. The
browser rejects it — _"Expected a JavaScript-or-Wasm module script"_ — and the effect on the host
is the same. Put the file back when you are done.

Now watch what happens to the **host**. It is worse than you would guess: the shell does
not lose the Products page, it does not boot at all — blank screen, and `app-root` empty. Home,
the basket, the `/lab` dashboard and the 404 page are gone too, and the console gives you
`Failed to load resource` and nothing else — no stack, and nothing naming the remote.

Here is why, and it is the most useful thing in this file. Look at `apps/shell/src/main.ts`:

```ts
import('./bootstrap').catch((err) => console.error(err));
```

That indirection is not decoration. Shared modules must be initialised before any shared code
runs, so webpack initialises the share scope **and every statically-declared remote** while
resolving that first split chunk. A dead `remoteEntry.mjs` breaks that chunk — before Angular
bootstraps, before the router exists.

Note that the `.catch()` on that very line does not save you either, and does not even print:
the failure happens inside the container-initialisation code webpack wraps _around_ the import,
so nothing reaches your handler. Blank page, two anonymous resource errors, no clue. That
silence is the point of the exercise.

Which means the `.catch()` on the shell's `/products` route cannot help here. It is still
worth having: it covers a container that _loads_ but cannot supply the module (a renamed key,
an exposed file that throws, a 404 chunk). It does not cover a remote that is entirely absent.

Surviving that case needs **dynamic** remote loading: don't declare the remote at build time,
fetch its URL at startup, register it, and load modules through an API you can wrap in a
`try`/`catch`. You also stop baking environment URLs into bundles, which is the other reason
production systems do it. The cost is more moving parts and losing build-time type safety on
the remote's specifiers.

## `apps/*/project.json` — the serve targets, and why the ports matter

Two keys in these files reach further than they look.

`targets.serve.options.port` on **products** is `4272`, and that number ends up inside the
_shell's_ bundle. `withModuleFederation` resolves each remote's URL at build time by reading the
remote's serve target — `host` (defaulting to `http://localhost`) and `port` — and writes
`http://localhost:4272/remoteEntry.mjs` into the host. So the port is part of the contract between
the two applications, not a local preference. Change it here and the built shell goes looking for
a remote that is not there.

`publicHost: "http://127.0.0.1:4272"`, on the same target, looks like it should be that address
and is not. It is the hot-reload client's URL, and nothing consults it when resolving the remote
entry. Worth knowing precisely because it is the plausible-looking wrong answer.

The shell's `serve` target is a plain `@nx/angular:dev-server`, which is why this lab runs the two
applications in two terminals. Nx also ships `@nx/angular:module-federation-dev-server`, which
starts the remotes for you from one command — convenient, but it does not survive this dependency
set (its runtime-library-control plugin calls a webpack parser API that webpack 5.109 removed), and
two visible terminals arguably match the architecture better anyway: these are two deployables.

One local addition sits on top of the federation config in `apps/shell/webpack.config.ts`:
`devServer.historyApiFallback`, so that opening `/products` or `/lab` directly serves `index.html`
instead of 404ing. Nothing to do with federation — but serving deep links is a real hosting
requirement of a host application, and you get to make the same decision again in production.
