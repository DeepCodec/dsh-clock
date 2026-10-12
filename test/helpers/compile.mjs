/**
 * Build helper: compile a browser-half JSX source into a loadable spec module
 * for tests, the same way build.mjs bundles the real client (esbuild, react
 * and baseline modules external, JSX enabled).
 */
import { build } from 'esbuild'

/** Compile one JSX entry to a CJS string that tests `require()` in-sandbox. */
export async function compileModule(entryPoints) {
  const result = await build({
    entryPoints,
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: ['es2020'],
    external: [
      'react',
      '@deepseek-ai/dsh-client-store',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-primitives',
    ],
    loader: { '.css': 'text' },
    write: false,
    charset: 'utf8',
    logLevel: 'silent',
  })
  return result.outputFiles.map((file) => file.text)
}