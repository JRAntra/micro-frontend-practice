import { ModuleFederationConfig } from '@nx/module-federation';

/**
 * The HOST side of the federation contract.
 * Guided walkthrough: TOUR.md → "apps/shell/module-federation.config.ts".
 */
const config: ModuleFederationConfig = {
  /** The name this application is known by inside the federation. */
  name: 'shell',

  /**
   * Every remote this host is allowed to load.
   *
   * STEP s2: this is empty, so the shell knows about no remotes at all. Until a
   * remote is declared here, webpack has no reason to treat an import like
   * `products/Routes` as a container lookup — and will try to resolve it as an
   * ordinary module on disk instead.
   *
   * A bare string means "a project in this workspace with that name". Nx then
   * looks up that project's serve port and bakes
   * http://localhost:<port>/remoteEntry.mjs into this build.
   */
  remotes: [],

  /**
   * STEP s3: see the matching note in apps/products/module-federation.config.ts —
   * both sides have to agree, so this exclusion appears twice.
   *
   * STEP s5: this callback is also where the framework's version policy belongs.
   */
  shared: (name, sharedConfig) =>
    name === '@mf-lab/shared-auth' ? false : sharedConfig,
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 */
export default config;
