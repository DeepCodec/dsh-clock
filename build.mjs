/**
 * dsh-clock build: bundles the browser half into the DSH client-modules
 * registration shape (`window.__ModuleLoader__.load({ id, factory })`) and
 * bundles the host half as a plain ESM plugin.
 *
 * Browser half rules (packages/client/AGENTS.md + modules protocol):
 *  - the factory receives the module table's own `require`, so `react` (and
 *    any other dependency) must stay EXTERNAL — never bundled;
 *  - `.module.css` is loaded as TEXT (esbuild native) and injected once as a
 *    `<style data-plugin data-plugin-css>` tag at apply time (claimStyles
 *    ownership protocol);
 *  - the public export surface is exactly `apply`/`inject`.
 *
 * Host half: bundled ESM with `schemastery` EXTERNAL — the running dsh
 * supplies it from the profile/installation, matching how other plugins
 * consume it.
 */
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('lib', { recursive: true })

// ── browser half ────────────────────────────────────────────────────────────
const client = await build({
  entryPoints: ['src/client/index.jsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2020'],
  external: [
    'react',
    // Browser baseline modules the shell seeds (packages/client/web/src/platform.ts):
    // these are supplied by the module table, never bundled (AGENTS.md shared-modules rule).
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
  loader: { '.css': 'text' },
  write: false,
  charset: 'utf8',
  logLevel: 'silent',
})

const body = client.outputFiles[0].text
const wrapped = [
  "window.__ModuleLoader__.load({",
  "  id: '@deepcodec/dsh-clock',",
  "  factory: (require) => {",
  "    var module = { exports: {} };",
  "    var exports = module.exports;",
  body,
  "    return module.exports;",
  "  }",
  "});",
  "",
].join('\n')
await writeFile('lib/client.js', wrapped)

// ── host half ───────────────────────────────────────────────────────────────
const host = await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  external: ['@deepseek-ai/schemastery'],
  write: false,
  charset: 'utf8',
  logLevel: 'silent',
})
const hostBody = host.outputFiles[0].text
await writeFile('lib/index.js', hostBody)

console.log('built lib/client.js (%d bytes) and lib/index.js (%d bytes)',
  wrapped.length, hostBody.length)