import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import {
  PRODUCTS_DIST,
  PRODUCTS_PORT,
  PRODUCTS_URL,
  SHELL_DIST,
  SHELL_PORT,
  SHELL_URL,
} from './paths';

/**
 * Serves the BUILT output of both applications, each on its own port.
 *
 * Why this exists when `npm start` already runs a dev server: the dev server
 * compiles both applications from one Nx graph, with `tsconfig.base.json` path
 * mappings in play. That hides the two things production has and dev does not —
 * two separate origins, and no shared module resolution. If federation is wired
 * up wrong, `npm start` will often still render the page. This will not.
 *
 * The shell fetches the remote from a different origin, so EVERY response needs
 * CORS headers — including the error responses. Omitting them on a 404 makes the
 * browser report a CORS violation instead of "not found", which is a completely
 * different and much more confusing failure to debug.
 */
const CORS = { 'Access-Control-Allow-Origin': '*' } as const;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function serveDir(root: string, port: number): Promise<Server> {
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
    if (rel === '') rel = 'index.html';

    const target = join(root, normalize(rel));
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403, CORS).end('forbidden');
      return;
    }

    let body: Buffer;
    let served = target;
    try {
      body = await readFile(target);
    } catch {
      // SPA fallback so a deep link like /products boots the app.
      try {
        served = join(root, 'index.html');
        body = await readFile(served);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS });
        res.end('not found — did you run `npm run build`?');
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': TYPES[extname(served)] ?? 'application/octet-stream',
      ...CORS,
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    // NO host argument on purpose: Nx bakes `http://localhost:<port>` into the
    // shell, and `localhost` may resolve to ::1 or 127.0.0.1 depending on the
    // machine. Binding unqualified covers both stacks.
    server.listen(port, () => resolve(server));
  });
}

export interface ServedApps {
  close: () => Promise<void>;
}

/** Serve both built apps on the ports the build expects. */
export async function serveApps(): Promise<ServedApps> {
  const servers = [
    await serveDir(SHELL_DIST, SHELL_PORT),
    await serveDir(PRODUCTS_DIST, PRODUCTS_PORT),
  ];
  return {
    close: () =>
      Promise.all(
        servers.map((s) => new Promise<void>((r) => s.close(() => r())))
      ).then(() => undefined),
  };
}

/** CLI: `npm run serve:dist`. */
if (require.main === module) {
  void (async () => {
    try {
      const served = await serveApps();
      console.log(`shell    -> ${SHELL_URL}`);
      console.log(`products -> ${PRODUCTS_URL}/remoteEntry.mjs`);
      console.log('');
      console.log('Ctrl+C to stop. If these 404, run `npm run build` first.');
      const stop = () => void served.close().then(() => process.exit(0));
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    } catch (err) {
      console.error(`Could not start: ${String(err)}`);
      console.error(
        `Are ports ${SHELL_PORT} and ${PRODUCTS_PORT} already in use?`
      );
      process.exit(1);
    }
  })();
}
