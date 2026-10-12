/**
 * dsh-clock plugins-page row config interaction tests.
 *
 * Compiles ClockRowConfig.jsx like build.mjs does (esbuild, react external,
 * ui-primitives aliased to a stub), writing the bundle UNDER THE WORKSPACE so
 * `require("react")` resolves through the package's real node_modules, then
 * renders it with real react + react-test-renderer.
 *
 * Coverage:
 *  - the `view === 'summary'` face renders the one-line description;
 *  - the `view === 'page'` face renders the three controls;
 *  - each control triggers `form.mutate` with the expected field op;
 *  - the mode menu trigger reflects the current mode label.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { after, before } from 'node:test'
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const CACHE_DIR = join(ROOT, '.test-build')
const OUT = join(CACHE_DIR, 'rowconfig.cjs')

let row
before(async () => {
  mkdirSync(CACHE_DIR, { recursive: true })
  const result = await build({
    entryPoints: [join(ROOT, 'src/client/ClockRowConfig.jsx')],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: ['es2020'],
    external: ['react'],
    alias: {
      '@deepseek-ai/dsh-client-ui-primitives': join(ROOT, 'test/helpers/menu-stub.jsx'),
    },
    loader: { '.css': 'text' },
    write: false,
    charset: 'utf8',
    logLevel: 'silent',
  })
  writeFileSync(OUT, result.outputFiles[0].text)
  row = await import(OUT)
})

after(() => {
  rmSync(CACHE_DIR, { recursive: true, force: true })
})

/** A `form` face shaped like the plugin page's `formFor(rowId)` contract:
 * `{ state, mutate }`. */
function makeForm(initial = { mode: 'dateTime', weekday: true, showSeconds: true, intervalMs: 1000 }) {
  const mutations = []
  let section = { ...initial }
  let revision = 3
  const form = {
    state: { value: section, revision, writable: true },
    mutate: (ops, rev) => {
      mutations.push({ ops, rev })
      const set = ops.find(op => op.op === 'set')
      section = { ...section, [set.path[0]]: set.value }
      revision += 1
      form.state = { value: section, revision, writable: true }
      return Promise.resolve(form.state)
    },
  }
  return { form, mutations, get: () => section }
}

test('row config summary view renders the one-line description', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockRowConfig } = row.default

  const { form } = makeForm()
  const t = (key) => ({ 'settings.description': 'Show date & time in the bottom bar' }[key] ?? key)
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      React.createElement(ClockRowConfig, { view: 'summary', form, t }),
    )
  })
  const json = JSON.stringify(tree.toJSON())
  assert.match(json, /Show date & time in the bottom bar/)
  tree.unmount()
})

test('row config page view renders the three controls', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockRowConfig } = row.default

  const { form } = makeForm()
  const t = (key) => key
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(ClockRowConfig, { view: 'page', form, t }))
  })
  assert.equal(tree.root.findAllByProps({ role: 'switch' }).length, 2)
  assert.equal(tree.root.findAllByType('input').length, 1)
  tree.unmount()
})

test('row config switches write through form.mutate with field ops', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockRowConfig } = row.default

  const { form, mutations } = makeForm()
  const t = (key) => key
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(ClockRowConfig, { view: 'page', form, t }))
  })
  const [weekdaySwitch, secondsSwitch] = tree.root.findAllByProps({ role: 'switch' })
  TestRenderer.act(() => { weekdaySwitch.props.onClick() })
  TestRenderer.act(() => { secondsSwitch.props.onClick() })
  assert.deepEqual(
    mutations.map(m => ({ path: m.ops[0].path[0], value: m.ops[0].value })),
    [{ path: 'weekday', value: false }, { path: 'showSeconds', value: false }],
  )
  tree.unmount()
})

test('row config interval input writes through form.mutate', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockRowConfig } = row.default

  const { form, mutations } = makeForm()
  const t = (key) => key
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(ClockRowConfig, { view: 'page', form, t }))
  })
  const input = tree.root.findAllByType('input')[0]
  TestRenderer.act(() => {
    input.props.onChange({ target: { value: '2500' } })
  })
  assert.deepEqual(mutations.map(m => ({ path: m.ops[0].path[0], value: m.ops[0].value })),
    [{ path: 'intervalMs', value: 2500 }])
  tree.unmount()
})

test('row config mode trigger reflects the active mode label', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockRowConfig } = row.default

  const { form } = makeForm({ mode: 'time', weekday: false, showSeconds: true, intervalMs: 1000 })
  const t = (key) => ({ 'settings.mode.time': 'Time only' }[key] ?? key)
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(ClockRowConfig, { view: 'page', form, t }))
  })
  const json = JSON.stringify(tree.toJSON())
  assert.match(json, /Time only/)
  tree.unmount()
})