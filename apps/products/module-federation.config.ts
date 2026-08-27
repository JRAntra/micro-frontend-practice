import { ModuleFederationConfig } from '@nx/module-federation';

/**
 * The REMOTE side of the federation contract.
 * Guided walkthrough: TOUR.md → "apps/products/module-federation.config.ts".
 */
const config: ModuleFederationConfig = {
  /**
   * The container name. The shell asks for modules from a container with this
   * name, so this string is half of every federated import specifier.
   */
  name: 'products',

  /**
   * The public API of this remote — the ONLY modules the outside world may import.
   *
   * STEP s1: this is empty, so the products application currently publishes
   * nothing. Everything in the project is private, no matter how it is exported
   * in TypeScript.
   *
   * STEP s4: later you will publish a second, finer-grained entry point here.
   *
   * Shape:  '<public key>': '<path to the file in THIS project>'
   */
  exposes: {},

  /**
   * STEP s3: a previous developer excluded @mf-lab/shared-auth from sharing to
   * silence a version warning. The build stays green and the console stays clean,
   * but the shell and this remote now each carry their own private copy of the
   * session store.
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
