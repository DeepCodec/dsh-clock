/**
 * dsh-clock browser-half tests.
 *
 * Runs against the built `lib/client.js` and the pure helpers:
 *  - registration surface is exactly apply/inject (AGENTS.md export rule);
 *  - every declared inject target is a service the DSH 0.2.0-rc.2 web runtime
 *    actually provides — a missing one leaves the fiber pending and the
 *    web-boot audit fails the whole page (the `settingsScope` regression);
 *  - apply registers the locale dictionaries, binds the configForms form, and
 *    mounts both the composer dock and the Settings → General row;
 *  - ClockPolicy adopts host settings, writes explicit choices, clamps the
 *    interval, and releases its subscription;
 *  - the built artifact stamps style-tag ownership ids and keeps baseline
 *    modules external (never bundled).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// ── helpers ─────────────────────────────────────────────────────────────────
const REGISTRATIONS = []
globalThis.window = { __ModuleLoader__: { load: (reg) => REGISTRATIONS.push(reg) } }

// React stand-in that records createElement calls.
const fakeReact = {
  createElement: (type, props, ...children) => {
    return { type: typeof type === 'string' ? type : (type.name ?? 'fn'), props, children }
  },
  useEffect: () => {},
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  Fragment: Symbol('Fragment'),
}
globalThis.require = (spec) => {
  if (spec === 'react') return fakeReact
  if (spec === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: (initial) => {
    let snapshot = initial
    const listeners = new Set()
    return {
      getSnapshot: () => snapshot,
      subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) },
      set: (next) => { snapshot = next; for (const l of listeners) l() },
    }
  } }
  if (spec === '@deepseek-ai/dsh-client-ui-primitives') return { Menu: () => null }
  throw new Error('unexpected require: ' + spec)
}

/** A stub settings form, shaped like ui-settings' ConfigFormController. */
function makeForm(initialValue) {
  const state = { value: initialValue, revision: 1, writable: true }
  const listeners = new Set()
  return {
    state,
    getSnapshot: () => ({ ...state }),
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) },
    set: (field, value) => { state.value = { ...state.value, [field]: value }; for (const l of listeners) l() },
    emit: () => { for (const l of listeners) l() },
  }
}

test('built client exports only apply and inject', async () => {
  await import('../lib/client.js')
  const reg = REGISTRATIONS.at(-1)
  assert.equal(reg.id, '@deepcodec/dsh-clock')
  const mod = reg.factory(globalThis.require)
  assert.deepEqual(Object.keys(mod).sort(), ['apply', 'inject'])
  assert.deepEqual(mod.inject, ['slots', 'locale', 'configForms'])
})

test('declared inject targets are services the web runtime provides', async () => {
  await import('../lib/client.js')
  const mod = REGISTRATIONS.at(-1).factory(globalThis.require)
  // Verified against the shipped 0.2.0-rc.2 client bundles: `slots` is the
  // cordis Service of @deepseek-ai/dsh-client-ui-renderer, `configForms` the
  // Service of @deepseek-ai/dsh-client-ui-settings, and `locale` is provided
  // by @deepseek-ai/dsh-client-locale (`ctx.provide("locale", …)`).
  const RUNTIME_SERVICES = new Set(['slots', 'locale', 'configForms'])
  for (const name of mod.inject) {
    assert.ok(RUNTIME_SERVICES.has(name), `inject target "${name}" is not a DSH client service`)
  }
  // The original bug: a non-existent service kept the fiber pending forever.
  assert.ok(!mod.inject.includes('settingsScope'))
})

test('ClockPolicy adopts host settings and clamps interval', async () => {
  const { ClockPolicy } = await import('../src/client/clock-policy.js')
  const form = makeForm({ mode: 'time', weekday: false, showSeconds: false, intervalMs: 2000 })
  const policy = new ClockPolicy(form)
  assert.equal(policy.settings.getSnapshot().mode, 'time')
  assert.equal(policy.settings.getSnapshot().intervalMs, 2000)

  // Host update flows into the policy.
  form.state.value = { ...form.state.value, intervalMs: 5000 }
  form.emit()
  assert.equal(policy.settings.getSnapshot().intervalMs, 5000)

  // Explicit choice writes through and clamps.
  policy.setIntervalMs(10_000_000)
  assert.equal(policy.settings.getSnapshot().intervalMs, 60000)
  assert.equal(form.state.value.intervalMs, 60000)
  policy.setMode('dateTime')
  assert.equal(policy.settings.getSnapshot().mode, 'dateTime')
  assert.equal(form.state.value.mode, 'dateTime')
})

test('ClockPolicy keeps defaults before host arrives and ignores invalid sections', async () => {
  const { ClockPolicy } = await import('../src/client/clock-policy.js')
  const form = makeForm(undefined)
  const policy = new ClockPolicy(form)
  assert.equal(policy.settings.getSnapshot().mode, 'dateTime')
  assert.equal(policy.settings.getSnapshot().weekday, true)

  form.state.value = { mode: 'bogus', intervalMs: 1 }
  form.emit()
  assert.equal(policy.settings.getSnapshot().mode, 'dateTime')
  assert.equal(policy.settings.getSnapshot().intervalMs, 1000)
})

test('ClockPolicy tolerates an absent form and releases its subscription', async () => {
  const { ClockPolicy } = await import('../src/client/clock-policy.js')
  // No settings provider: the policy keeps local defaults and never throws.
  const bare = new ClockPolicy(undefined)
  bare.setMode('time')
  assert.equal(bare.settings.getSnapshot().mode, 'time')

  const form = makeForm({ mode: 'time' })
  const policy = new ClockPolicy(form)
  assert.equal(policy.settings.getSnapshot().mode, 'time')
  policy.dispose()
  form.state.value = { mode: 'date' }
  form.emit()
  // After dispose the policy stops adopting.
  assert.equal(policy.settings.getSnapshot().mode, 'time')
})

test('ClockPolicy adopts a partial section, keeping defaults for absent fields', async () => {
  const { ClockPolicy } = await import('../src/client/clock-policy.js')
  // The real describe() `value` carries only explicitly-written fields (schema
  // defaults live in `base`); adopt must keep the current/default value for
  // fields the partial section omits.
  const form = makeForm({ mode: 'time', weekday: false })
  const policy = new ClockPolicy(form)
  const snapshot = policy.settings.getSnapshot()
  assert.equal(snapshot.mode, 'time')
  assert.equal(snapshot.weekday, false)
  // Absent fields fall back to the seeded defaults, never undefined.
  assert.equal(snapshot.showSeconds, true)
  assert.equal(snapshot.intervalMs, 1000)
})

test('apply mounts dock and settings.row registrations', async () => {
  const localeCalls = []
  const slotCalls = []
  const formReads = []
  const ctx = {
    locale: { register: (ns) => { localeCalls.push(ns); return () => {} } },
    slots: {
      inject: (name, factory) => { slotCalls.push(name); factory(); return () => {} },
      register: (opts) => { slotCalls.push(opts); return () => {} },
    },
    configForms: { get: (id) => { formReads.push(id); return makeForm(undefined) } },
    effect: (cb) => { cb(); return () => {} },
  }
  const reg = REGISTRATIONS.at(-1)
  const mod = reg.factory(globalThis.require)
  mod.apply(ctx)
  assert.deepEqual(localeCalls, ['clock'])
  // The form is bound under the profile entry id the bundle patch inserts.
  assert.deepEqual(formReads, ['dsh-clock'])
  assert.ok(slotCalls.includes('conversation.composer.dock'))
  assert.ok(slotCalls.includes('settings.general.item'))
  assert.ok(slotCalls.includes('plugins.row.config'))
  const dock = slotCalls.find(x => typeof x === 'object' && x.name === 'conversation.composer.dock')
  const row = slotCalls.find(x => typeof x === 'object' && x.name === 'settings.general.item')
  const rowConfig = slotCalls.find(x => typeof x === 'object' && x.name === 'plugins.row.config')
  assert.equal(dock.id, 'dsh-clock')
  assert.equal(dock.locale, 'clock')
  assert.equal(row.id, 'dsh-clock')
  // The plugins-page row config is keyed by bundle#rowId: the bundle is the
  // plugin package and the row id is the cordis entry our patch declares.
  assert.equal(rowConfig.key, 'dsh-clock#dsh-clock')
  assert.equal(rowConfig.locale, 'clock')
})

test('formatting helpers localize date and time', async () => {
  const core = await import('../src/client/clock-core.js')
  const t = (key, params) => {
    const dict = {
      'dock.date': '{year}年{month}月{day}日',
      'dock.weekday': '星期{weekday}',
      'dock.weekday.0': '日',
      'dock.weekday.1': '一',
      'dock.weekday.2': '二',
      'dock.weekday.3': '三',
      'dock.weekday.4': '四',
      'dock.weekday.5': '五',
      'dock.weekday.6': '六',
      'dock.time': '{hour}:{minute}{seconds}',
      'dock.seconds': ':{second}',
    }
    let out = dict[key] ?? key
    for (const [k, v] of Object.entries(params ?? {})) out = out.replaceAll(`{${k}}`, v)
    return out
  }
  const now = new Date(2026, 9, 12, 14, 5, 9) // Oct 12 2026 14:05:09
  assert.equal(core.formatDate(now, t, { weekday: true }), '2026年10月12日 星期一')
  assert.equal(core.formatTime(now, t, { showSeconds: true }), '14:05:09')
  assert.equal(core.formatTime(now, t, { showSeconds: false }), '14:05')
})

test('built artifact stamps style ids and keeps baseline modules external', async () => {
  const { readFileSync } = await import('node:fs')
  const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(client, /data-plugin/)
  assert.match(client, /data-plugin-css/)
  assert.match(client, /dsh-clock-root/)
  assert.match(client, /dsh-clock-settings-section/)
  // Baseline modules must be required, not inlined.
  assert.match(client, /require\("@deepseek-ai\/dsh-client-store"\)/)
  assert.match(client, /require\("@deepseek-ai\/dsh-client-ui-primitives"\)/)
  // The settings transport is a service, never a module import.
  assert.doesNotMatch(client, /require\("@deepseek-ai\/dsh-client-ui-settings"\)/)
  assert.doesNotMatch(client, /settingsScope/)
  // Plugins-page row configuration is registered under the bundle#rowId key.
  assert.match(client, /plugins\.row\.config/)
  assert.match(client, /dsh-clock#dsh-clock/)
  // No inline style objects.
  assert.doesNotMatch(client, /<div style=|<span style=/)
})

test('stylesheet references only theme tokens that exist in the shipped theme', async () => {
  const { readFileSync } = await import('node:fs')
  const css = [
    readFileSync(new URL('../src/client/clock.css', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/client/ClockSettingsRow.css', import.meta.url), 'utf8'),
  ].join('\n')

  // No literal colors anywhere (tokens only; artwork is the sole exception,
  // and this plugin draws none).
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/)
  assert.doesNotMatch(css, /\b(?:rgba?|hsla?)\(/)

  // Tokens verified against @deepseek-ai/dsh-client-ui-theme 0.2.0-rc.2. The
  // names below were previously wrong (`--dsw-alias-interactive-bg`,
  // `--dsw-alias-state-bg`, `--dsw-alias-label-primary-inverse` are not
  // defined by the theme, so the controls rendered without a surface).
  const VERIFIED_TOKENS = new Set([
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-label-tertiary',
    '--dsw-alias-border-l3',
    '--dsw-alias-border-l4',
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-interactive-bg-hover',
    '--dsw-alias-brand-primary',
    '--dsw-alias-switch-thumb',
    '--dsw-focus-ring-color',
    '--dsw-focus-ring-width',
    '--dsw-alias-state-business-primary',
  ])
  const used = [...new Set([...css.matchAll(/--dsw-[a-z0-9-]+/g)].map((match) => match[0]))]
  assert.ok(used.length > 0)
  for (const token of used) {
    assert.ok(VERIFIED_TOKENS.has(token), `theme token "${token}" is not defined by the shipped theme`)
  }
})
