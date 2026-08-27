import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRODUCTS_DIST, SHELL_DIST, WS_ROOT } from './paths';

/** One shared entry as it appears in a built mf-manifest.json. */
export interface SharedEntry {
  name: string;
  version?: string;
  singleton?: boolean;
  requiredVersion?: string | false;
}

export interface Manifest {
  name: string;
  exposes?: { name: string; path: string }[];
  remotes?: {
    federationContainerName: string;
    moduleName: string;
    alias: string;
    entry: string;
  }[];
  shared?: SharedEntry[];
}

/**
 * The EFFECTIVE federation config, as emitted by the build.
 *
 * Reading the built manifest beats parsing the .ts config for two reasons: it is
 * what actually shipped (a config that looks right but does not take effect still
 * fails), and it does not care *how* you expressed the configuration.
 *
 * Returns null when there is no build yet — `npm run verify:build` is what needs
 * this; the unit tests use mfConfig() below and need no build at all.
 */
export function manifest(app: 'shell' | 'products'): Manifest | null {
  const p = join(
    app === 'shell' ? SHELL_DIST : PRODUCTS_DIST,
    'mf-manifest.json'
  );
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

export function distFileExists(
  app: 'shell' | 'products',
  file: string
): boolean {
  return existsSync(join(app === 'shell' ? SHELL_DIST : PRODUCTS_DIST, file));
}

/** Read a workspace file as text, or null if it isn't there. */
export function wsFile(relative: string): string | null {
  const p = join(WS_ROOT, relative);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

/** Read a workspace JSON file, tolerating // and /* comments. */
export function wsJson<T = unknown>(relative: string): T | null {
  const raw = wsFile(relative);
  if (raw === null) return null;
  try {
    return JSON.parse(stripJsonComments(raw)) as T;
  } catch {
    return null;
  }
}

function stripJsonComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'\\])\/\/.*$/gm, '$1');
}

/** Find a shared entry by exact package name. */
export function sharedEntry(
  m: Manifest | null,
  name: string
): SharedEntry | undefined {
  return m?.shared?.find((s) => s.name === name);
}

export interface SharedLibraryConfig {
  singleton?: boolean;
  strictVersion?: boolean;
  requiredVersion?: string | false;
  eager?: boolean;
}

export interface MfConfig {
  name?: string;
  exposes?: Record<string, string>;
  remotes?: unknown[];
  shared?: (
    name: string,
    config: SharedLibraryConfig
  ) => SharedLibraryConfig | false | undefined;
}

/**
 * Load a module-federation.config.ts by transpiling it with the workspace's own
 * TypeScript and evaluating it.
 *
 * Needed because a few things the lab checks — `strictVersion` in particular —
 * are consumed by webpack but never written into mf-manifest.json, so there is
 * nowhere else to observe them. Evaluating beats regex-matching the source: it
 * doesn't care about formatting, comments, or how the candidate chose to express
 * the callback.
 */
export function mfConfig(app: 'shell' | 'products'): MfConfig | null {
  const rel = `apps/${app}/module-federation.config.ts`;
  const src = wsFile(rel);
  if (src === null) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ts = require('typescript');
    const { outputText } = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: rel,
    });
    const module = { exports: {} as Record<string, unknown> };
    const fn = new Function(
      'exports',
      'require',
      'module',
      '__filename',
      '__dirname',
      outputText
    );
    fn(
      module.exports,
      require,
      module,
      join(WS_ROOT, rel),
      join(WS_ROOT, `apps/${app}`)
    );
    const exported = module.exports as { default?: MfConfig };
    return exported.default ?? (module.exports as MfConfig) ?? null;
  } catch {
    return null;
  }
}

/**
 * What the candidate's `shared` callback decides for one package, starting from
 * the defaults Nx would have applied.
 */
export function sharedDecisionFor(
  app: 'shell' | 'products',
  pkg: string,
  defaults: SharedLibraryConfig = { singleton: true }
): SharedLibraryConfig | false | undefined | 'no-callback' {
  const cfg = mfConfig(app);
  if (!cfg) return undefined;
  if (typeof cfg.shared !== 'function') return 'no-callback';
  return cfg.shared(pkg, { ...defaults });
}
