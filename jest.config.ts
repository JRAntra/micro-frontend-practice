import type { Config } from 'jest';

/**
 * The lab checks.
 *
 * Six files, one per step, each asserting the configuration decisions that step is
 * about. They read your `module-federation.config.ts` files by evaluating them, so
 * the whole suite runs in a couple of seconds: no build, no browser, no servers.
 *
 * That is deliberate but it is also a limit worth knowing. These checks prove your
 * *configuration* is right. They cannot prove the remote actually renders in a real
 * browser across two real origins — for that, run `npm start` and watch the
 * dashboard at http://localhost:4271/lab, or `npm run verify:build`.
 *
 * The applications' own unit tests live in apps/*\/jest.config.ts and are run
 * separately by `nx run-many -t test`.
 */
const config: Config = {
  displayName: 'lab',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],

  // Keeps the six steps in order in the output, which matters when you are reading
  // it as a to-do list rather than a test report.
  maxWorkers: 1,

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          module: 'commonjs',
          target: 'ES2022',
          lib: ['ES2022', 'DOM'],
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          skipLibCheck: true,
          strict: false,
          types: ['node', 'jest'],
        },
      },
    ],
  },

  // The step name is the whole story; the failure message carries the teaching.
  verbose: false,
};

export default config;
