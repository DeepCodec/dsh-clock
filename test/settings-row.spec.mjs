/**
 * dsh-clock Settings-row interaction tests.
 *
 * Compiles ClockSettingsRow.jsx like build.mjs does (esbuild, react external,
 * ui-primitives aliased to a stub), writing the bundle UNDER THE WORKSPACE so
 * `require("react")` resolves through the package's real node_modules, then
 * renders it with REAL react + react-test-renderer.
 *
 * Coverage:
 *  - the three controls (weekday switch, seconds switch, interval input)
 *    render beside the title/description;
 *  - each control invokes its write callback with the expected next value;
 *  - the menu trigger reflects the current mode label.
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
const OUT = join(CACHE_DIR, 'row.cjs')

// ── compile a self-contained CJS bundle of the settings row ────────────────
let row
before(async () => {
  mkdirSync(CACHE_DIR, { recursive: true })
  const result = await build({
    entryPoints: [join(ROOT, 'src/client/ClockSettingsRow.jsx')],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: ['es2020'],
    // Only react resolves through Node's real module table; ui-primitives is
    // aliased so the real package (and its own deps) never loads.
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
  // The bundle must be imported AFTER the file exists — a top-level
  // `await import(OUT)` would run before `before()` compiled it.
  row = await import(OUT)
})

after(() => {
  rmSync(CACHE_DIR, { recursive: true, force: true })
})

/** Create a store stub shaped like ClockPolicy.settings: a createSnapshotStore
 * whose snapshot IS the settings object (getSnapshot returns the object), and
 * a captured write log the seeded `set` accumulates. */
function makeHarness(initial = { mode: 'dateTime', weekday: true, showSeconds: true, intervalMs: 1000 }) {
  const writes = []
  let value = { ...initial }
  const listeners = new Set()
  const store = {
    getSnapshot: () => value,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) },
    set: (next) => { value = { ...next }; for (const l of listeners) l() },
  }
  // A plain function for the slice the row selects through.
  const useSnapshot = (sel) => sel(store.getSnapshot())
  return { store, useSnapshot, writes, get: () => value }
}

test('settings row renders title, description, and three controls', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockSettingsRow } = row.default

  const { useSnapshot } = makeHarness()
  const t = (key) => ({ 'settings.title': 'Title', 'settings.description': 'Desc' }[key] ?? key)
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      React.createElement(ClockSettingsRow, {
        useClockSettings: useSnapshot,
        t,
        setMode: () => {}, setWeekday: () => {}, setShowSeconds: () => {}, setIntervalMs: () => {},
      }),
    )
  })
  const json = tree.toJSON()
  assert.ok(json)
  const text = JSON.stringify(json)
  assert.match(text, /Title/)
  assert.match(text, /Desc/)
  // The controls are present: two switches + one number input.
  assert.equal(tree.root.findAllByProps({ role: 'switch' }).length, 2)
  assert.equal(tree.root.findAllByType('input').length, 1)
  tree.unmount()
})

test('weekday and seconds switches call their write callbacks with the toggled value', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockSettingsRow } = row.default

  const { useSnapshot, writes } = makeHarness()
  const t = (key) => key
  const callbacks = {
    setWeekday: (v) => { writes.push(['weekday', v]) },
    setShowSeconds: (v) => { writes.push(['showSeconds', v]) },
  }
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      React.createElement(ClockSettingsRow, {
        useClockSettings: useSnapshot,
        t,
        setMode: () => {}, ...callbacks,
      }),
    )
  })
  const [weekdaySwitch, secondsSwitch] = tree.root.findAllByProps({ role: 'switch' })
  TestRenderer.act(() => { weekdaySwitch.props.onClick() })
  TestRenderer.act(() => { secondsSwitch.props.onClick() })
  assert.deepEqual(writes, [['weekday', false], ['showSeconds', false]])
  tree.unmount()
})

test('interval input writes its parsed number through setIntervalMs', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockSettingsRow } = row.default

  const { useSnapshot, writes } = makeHarness()
  const t = (key) => key
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      React.createElement(ClockSettingsRow, {
        useClockSettings: useSnapshot,
        t,
        setMode: () => {}, setIntervalMs: (v) => { writes.push(['intervalMs', v]) },
      }),
    )
  })
  const input = tree.root.findAllByType('input')[0]
  TestRenderer.act(() => {
    input.props.onChange({ target: { value: '2500' } })
  })
  assert.deepEqual(writes, [['intervalMs', 2500]])
  tree.unmount()
})

test('menu trigger reflects the current mode label', async () => {
  const React = await import('react')
  const TestRenderer = await import('react-test-renderer')
  const { ClockSettingsRow } = row.default

  const { useSnapshot } = makeHarness({ mode: 'time', weekday: true, showSeconds: true, intervalMs: 1000 })
  const t = (key) => ({ 'settings.mode.time': 'Time only' }[key] ?? key)
  let tree
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      React.createElement(ClockSettingsRow, {
        useClockSettings: useSnapshot,
        t,
        setMode: () => {}, setWeekday: () => {}, setShowSeconds: () => {}, setIntervalMs: () => {},
      }),
    )
  })
  const json = JSON.stringify(tree.toJSON())
  assert.match(json, /Time only/)
  tree.unmount()
})