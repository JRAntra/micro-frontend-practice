import { join, resolve } from 'node:path';

/** The workspace root — tools/ always sits directly under it. */
export const WS_ROOT = resolve(__dirname, '..');

export const DIST_ROOT = join(WS_ROOT, 'dist', 'apps');
export const SHELL_DIST = join(DIST_ROOT, 'shell');
export const PRODUCTS_DIST = join(DIST_ROOT, 'products');

/**
 * Lab ports, deliberately not 4200/4201 — those are the Angular and Nx defaults and
 * collide with whatever else you have running.
 *
 * PRODUCTS_PORT must match `targets.serve.options.port` in apps/products/project.json,
 * because Nx bakes `http://localhost:<that port>/remoteEntry.mjs` into the shell at
 * build time. It reads `serve.options.host` and `serve.options.port` and nothing
 * else — in particular it ignores `publicHost`, which is only the HMR client URL.
 * Change the port in one place and the built shell looks for a remote that is not
 * there.
 */
export const SHELL_PORT = 4271;
export const PRODUCTS_PORT = 4272;

export const SHELL_URL = `http://localhost:${SHELL_PORT}`;
export const PRODUCTS_URL = `http://localhost:${PRODUCTS_PORT}`;

export const REMOTE_ENTRY = 'remoteEntry.mjs';
