import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import {
  PRODUCTS_DIST,
  PRODUCTS_PORT,
  PRODUCTS_URL,
  REMOTE_ENTRY,
  SHELL_DIST,
  SHELL_PORT,
  SHELL_URL,
  WS_ROOT,
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

/** Written by tools/lab-reporter.cjs on every `npm test`. */
const LAB_STATUS = join(WS_ROOT, '.lab', 'status.json');

export interface ServeOptions {
  /**
   * Paths this origin should pretend not to have, e.g. `['remoteEntry.mjs']`.
   *
   * This is how you make the remote look like a failed deploy without touching the
   * build — see TOUR.md → "Blast radius", and DESIGN.md question 5. A hidden path
   * returns a real 404 and skips the SPA fallback, because the whole point is to
   * see what the host does when its container is genuinely missing. (Falling back
   * to index.html here would hand the browser HTML where it expects an ES module,
   * which fails for a completely different and much less interesting reason.)
   */
  hide?: string[];
}

function serveDir(
  root: string,
  port: number,
  options: ServeOptions = {}
): Promise<Server> {
  const hidden = new Set(
    (options.hide ?? []).map((p) => p.replace(/^\/+/, ''))
  );

  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
    if (rel === '') rel = 'index.html';

    if (hidden.has(rel)) {
      res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS });
      res.end(`not found — ${rel} is hidden by the blast-radius experiment`);
      return;
    }

    // The shell's dev server exposes this; mirror it so /lab shows your last
    // `npm test` result against the built output too.
    if (rel === 'lab-status.json') {
      try {
        const body = await readFile(LAB_STATUS, 'utf8');
        res.writeHead(200, { 'Content-Type': TYPES['.json'], ...CORS });
        res.end(body);
      } catch {
        res.writeHead(404, { 'Content-Type': TYPES['.json'], ...CORS });
        res.end('{"ranAt":null,"steps":{}}');
      }
      return;
    }

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
export async function serveApps(
  options: { shell?: ServeOptions; products?: ServeOptions } = {}
): Promise<ServedApps> {
  const servers = [
    await serveDir(SHELL_DIST, SHELL_PORT, options.shell),
    await serveDir(PRODUCTS_DIST, PRODUCTS_PORT, options.products),
  ];
  return {
    close: () =>
      Promise.all(
        servers.map((s) => new Promise<void>((r) => s.close(() => r())))
      ).then(() => undefined),
  };
}

/**
 * CLI. Two modes:
 *
 *   npm run serve:dist      both applications, served normally
 *   npm run blast-radius    the same, but the remote's container returns 404
 */
if (require.main === module) {
  const blast = process.argv.includes('--blast-radius');

  void (async () => {
    try {
      const served = await serveApps(
        blast ? { products: { hide: [REMOTE_ENTRY] } } : {}
      );

      if (blast) {
        console.log(
          '  BLAST RADIUS — the products container is returning 404.'
        );
        console.log('');
        console.log(`  shell     -> ${SHELL_URL}`);
        console.log(`  products  -> ${PRODUCTS_URL}  (${REMOTE_ENTRY} hidden)`);
        console.log('');
        console.log(
          '  Open the shell and predict what you will see before you look.'
        );
        console.log(
          '  Then read TOUR.md -> "Blast radius" for why it happens there.'
        );
      } else {
        console.log(`  shell    -> ${SHELL_URL}`);
        console.log(`  products -> ${PRODUCTS_URL}/${REMOTE_ENTRY}`);
      }

      console.log('');
      console.log('  Ctrl+C to stop. If these 404, run `npm run build` first.');

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
