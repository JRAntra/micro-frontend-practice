import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

/**
 * DTS Plugin is disabled in Nx Workspaces as Nx already provides Typing support for Module Federation
 * The DTS Plugin can be enabled by setting dts: true
 * Learn more about the DTS Plugin here: https://module-federation.io/configure/dts.html
 */
type FederationFn = Awaited<ReturnType<typeof withModuleFederation>>;

/** Written by tools/lab-reporter.cjs on every `npm test`. */
const LAB_STATUS = join(__dirname, '..', '..', '.lab', 'status.json');

/**
 * Two additions on top of the federation setup, both dev-server concerns and
 * neither of them federation.
 *
 * 1. SPA history fallback, so opening http://localhost:4271/products or /lab
 *    directly serves index.html and lets the Angular router take over. Without it
 *    those URLs 404 — the dev server looks for a file at that path, does not find
 *    one, and never reaches the application. Client-side navigation works either
 *    way, which is what makes this easy to miss until someone reloads a deep link.
 *
 *    It is left visible rather than hidden because serving deep links is a real
 *    hosting requirement of a host application, and you get to make the same
 *    decision again in production.
 *
 * 2. GET /lab-status.json, which hands the /lab dashboard the result of your last
 *    `npm test` run. Served from a middleware rather than dropped into
 *    apps/shell/public/ on purpose: anything under public/ is a watched build
 *    asset, so writing it on every test run would kick off a rebuild you did not
 *    ask for. Reading it off disk per request costs nothing and never invalidates
 *    the build.
 *
 * Note the `await`: `withModuleFederation` is async — it resolves the remotes'
 * URLs from the workspace before it can return the config function.
 */
export default async (...args: Parameters<FederationFn>) => {
  const federated = await withModuleFederation(config, { dts: false });
  const merged = await federated(...args);

  return {
    ...merged,
    devServer: {
      ...merged.devServer,
      historyApiFallback: {
        index: '/index.html',
        rewrites: [{ from: /./, to: '/index.html' }],
      },
      setupMiddlewares: (
        middlewares: unknown[],
        devServer: { app?: LabStatusApp }
      ) => {
        devServer.app?.get('/lab-status.json', (_req, res) => {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            res.send(readFileSync(LAB_STATUS, 'utf8'));
          } catch {
            // No test run yet. Not an error — the dashboard renders a
            // "run npm test" prompt for exactly this shape.
            res.status(404).send('{"ranAt":null,"steps":{}}');
          }
        });
        return middlewares;
      },
    },
  };
};

/** The slice of webpack-dev-server's express app this file uses. */
interface LabStatusApp {
  get(
    path: string,
    handler: (
      req: unknown,
      res: {
        setHeader(name: string, value: string): void;
        status(code: number): { send(body: string): void };
        send(body: string): void;
      }
    ) => void
  ): void;
}
