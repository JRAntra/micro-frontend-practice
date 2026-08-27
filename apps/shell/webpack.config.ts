import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

/**
 * DTS Plugin is disabled in Nx Workspaces as Nx already provides Typing support for Module Federation
 * The DTS Plugin can be enabled by setting dts: true
 * Learn more about the DTS Plugin here: https://module-federation.io/configure/dts.html
 */
type FederationFn = Awaited<ReturnType<typeof withModuleFederation>>;

/**
 * One addition on top of the federation setup: SPA history fallback for the dev
 * server, so opening http://localhost:4271/products or /lab directly serves
 * index.html and lets the Angular router take over.
 *
 * Without it those URLs 404 — the dev server looks for a file at that path, does
 * not find one, and never reaches the application. Client-side navigation (clicking
 * a link) works either way, which is what makes this easy to miss until someone
 * reloads on a deep link.
 *
 * Nothing to do with Module Federation. It is left visible rather than hidden
 * because serving deep links is a real hosting requirement of a host application,
 * and you get to make the same decision again in production.
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
    },
  };
};
