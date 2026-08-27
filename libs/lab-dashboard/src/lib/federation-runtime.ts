/**
 * Reads what Module Federation is *actually* doing in this browser tab.
 *
 * Everything here is defensive and read-only. It inspects globals that
 * `@module-federation/enhanced` installs at runtime, and those globals are
 * internal — their shape can change between versions. So every accessor returns
 * null rather than throwing, and the dashboard renders an honest "unknown"
 * whenever a probe comes back empty.
 *
 * Shape as verified against @module-federation 0.9 / Nx 20.8.4:
 *
 *   globalThis.__FEDERATION__ = {
 *     __INSTANCES__: [{
 *       options: { name: 'shell', remotes: [{ name, alias, entry }], ... },
 *       shareScopeMap: {
 *         default: {                              // share scope name
 *           '@angular/core': {
 *             '19.2.25': {                        // version
 *               version, from, useIn: ['shell'], loaded,
 *               shareConfig: { singleton, strictVersion, requiredVersion, eager },
 *             },
 *           },
 *         },
 *       },
 *     }],
 *     __SHARE__: { 'shell:1.0.0': { default: { …same… } } },   // one level deeper
 *   }
 *
 * Only `shareScopeMap` is read. `__SHARE__` carries the same data behind an extra
 * instance-keyed level, and walking both without accounting for that produced a
 * phantom package literally named "default".
 */

interface ShareEntry {
  version?: string;
  from?: string;
  useIn?: string[];
  loaded?: boolean;
  shareConfig?: {
    singleton?: boolean;
    strictVersion?: boolean;
    requiredVersion?: string | false;
    eager?: boolean;
  };
}

type ShareScopeMap = Record<string, Record<string, Record<string, ShareEntry>>>;

interface FederationInstance {
  name?: string;
  options?: {
    name?: string;
    remotes?: { name?: string; alias?: string; entry?: string }[];
  };
  shareScopeMap?: ShareScopeMap;
}

interface FederationGlobal {
  __INSTANCES__?: FederationInstance[];
}

function fed(): FederationGlobal | null {
  const g = globalThis as unknown as { __FEDERATION__?: FederationGlobal };
  return g.__FEDERATION__ ?? null;
}

/** True when the Module Federation runtime is present at all. */
export function runtimeAvailable(): boolean {
  return fed() !== null;
}

/**
 * Did this browser tab actually load a remote's container?
 *
 * This is the question step 2 turns on, and getting the *source* of the answer
 * right matters more here than anywhere else in the lab.
 *
 * What NOT to use:
 *
 *   - A successful `import('products/Routes')`. `tsconfig.base.json` maps that
 *     specifier straight at the remote's source file, so the import resolves and
 *     the page renders even with `remotes: []` and no federation whatsoever.
 *     See TOUR.md → "tsconfig.base.json — the workspace module map".
 *   - `__INSTANCES__[…].options.remotes`. It reads as the obvious answer and it is
 *     empty even when federation is working: Nx registers remotes through a
 *     runtime plugin rather than the static options array. Verified against
 *     @nx/module-federation 20.8.4.
 *
 * What is used instead, both of which are true only if a container really loaded:
 *
 *   1. The browser fetched `remoteEntry.mjs` from the remote's origin. This is
 *      literally the row you would look for in the DevTools Network tab.
 *   2. A federation instance named after the remote exists — the container
 *      initialised itself.
 */
export function remoteContainerLoaded(
  remoteName: string,
  origin: string
): boolean {
  const fetched = performance
    .getEntriesByType('resource')
    .some((e) => e.name.startsWith(origin) && e.name.includes('remoteEntry'));

  const initialised = (fed()?.__INSTANCES__ ?? []).some(
    (i) => (i.options?.name ?? i.name) === remoteName
  );

  return fetched && initialised;
}

export interface SharedPackage {
  name: string;
  version: string;
  singleton: boolean;
  strictVersion: boolean;
  requiredVersion: string;
  /** Applications actually consuming this copy. */
  usedBy: string[];
  /** The application that provided it. */
  providedBy: string;
  /** How many distinct versions are registered — >1 means no agreement. */
  versionCount: number;
}

/**
 * The live share scope: every package the applications agreed to share, with the
 * flags they agreed on.
 *
 * `@mf-lab/lab-dashboard` is filtered out. It is this dashboard's own library, it
 * gets auto-shared like any workspace library, and it is not part of the exercise —
 * leaving it in the table just invites the question "why is that there?".
 */
export function liveShareScope(): SharedPackage[] | null {
  const instances = fed()?.__INSTANCES__ ?? [];
  if (instances.length === 0) return null;

  const merged = new Map<string, SharedPackage>();

  for (const inst of instances) {
    for (const byPackage of Object.values(inst.shareScopeMap ?? {})) {
      for (const [pkg, byVersion] of Object.entries(byPackage ?? {})) {
        if (pkg === '@mf-lab/lab-dashboard') continue;

        const versions = Object.entries(byVersion ?? {});
        if (versions.length === 0) continue;

        const prev = merged.get(pkg);
        const usedBy = new Set(prev?.usedBy ?? []);
        const seen = new Set<string>();
        let singleton = prev?.singleton ?? false;
        let strictVersion = prev?.strictVersion ?? false;
        let requiredVersion = prev?.requiredVersion ?? '';
        let version = prev?.version ?? '';
        let providedBy = prev?.providedBy ?? '';

        for (const [v, entry] of versions) {
          seen.add(entry?.version ?? v);
          for (const app of entry?.useIn ?? []) usedBy.add(app);
          if (!providedBy && entry?.from) providedBy = entry.from;

          const cfg = entry?.shareConfig;
          if (cfg?.singleton) singleton = true;
          if (cfg?.strictVersion) strictVersion = true;
          if (typeof cfg?.requiredVersion === 'string')
            requiredVersion = cfg.requiredVersion;
          if (!version) version = entry?.version ?? v;
        }

        merged.set(pkg, {
          name: pkg,
          version,
          singleton,
          strictVersion,
          requiredVersion,
          usedBy: [...usedBy].sort(),
          providedBy,
          versionCount: Math.max(seen.size, prev?.versionCount ?? 0),
        });
      }
    }
  }

  return merged.size === 0
    ? null
    : [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function sharedPackage(name: string): SharedPackage | null {
  return liveShareScope()?.find((p) => p.name === name) ?? null;
}
