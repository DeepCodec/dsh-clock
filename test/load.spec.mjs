/**
 * dsh-clock real-load smoke tests.
 *
 * Unlike the stub-based client tests, these exercise the BUILT bundle the way
 * the DSH browser module table does:
 *  - the module table is a lazy CJS map: `window.__ModuleLoader__.load` only
 *    registers a factory; `factory(require)` materializes it, resolving
 *    baseline modules from the platform seed (REAL @deepseek-ai/dsh-client-store
 *    and react) and everything else from the graph expects to throw;
 *  - activating the plugin therefore means calling `apply` on a REAL
 *    cordis `Context` with every declared inject target provided — if a
 *    target is missing or misspelled, cordis leaves the entry PENDING
 *    (exactly the `waiting for service: settingsScope` failure class).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'

const REGISTRATIONS = []
globalThis.window = { __ModuleLoader__: { load: (reg) => REGISTRATIONS.push(reg) } }

// The module table's require: platform seed first, then a hard throw for
// anything outside the table (the client-modules purity gate).
const platformSeed = new Map([
  ['react', { createElement: () => null, useEffect: () => {}, useState: () => [], Fragment: Symbol('Fragment') }],
  ['@deepseek-ai/dsh-client-store', await import('@deepseek-ai/dsh-client-store')],
  ['@deepseek-ai/dsh-client-ui-primitives', { Menu: () => null }],
])

const seedRequire = (spec) => {
  if (platformSeed.has(spec)) return platformSeed.get(spec)
  throw new Error(`module table has no entry for "${spec}"`)
}

test('built bundle materializes against the real module table', async () => {
  await import('../lib/client.js')
  const reg = REGISTRATIONS[0]
  assert.equal(reg.id, '@deepcodec/dsh-clock')
  const mod = reg.factory(seedRequire)
  assert.equal(typeof mod.apply, 'function')
  assert.deepEqual(mod.inject, ['slots', 'locale', 'configForms'])
})

test('apply activates on a real cordis Context with its inject services provided', async () => {
  await import('../lib/client.js')
  const mod = REGISTRATIONS[0].factory(seedRequire)

  // A fresh cordis Context. The plugin's apply must not throw when every
  // declared inject target is provided; a missing one would leave the entry
  // pending in a real boot (the regression we are guarding against).
  const ctx = new Context()

  const slotEntries = []
  const localeRegistrations = []
  const formReads = []

  // `slots` — the renderer's service face the plugin uses (inject + register).
  ctx.provide('slots', {
    inject: (name, factory) => {
      slotEntries.push(name)
      factory() // run the factory so the inner register is observed
      return () => {}
    },
    register: (opts) => {
      // Keyed registrations (e.g. plugins.row.config) carry `key`, not `id`.
      slotEntries.push(`${opts.name}:${opts.key ?? opts.id}`)
      return () => {}
    },
  })

  // `locale` — the locale service face (register dictionaries).
  ctx.provide('locale', {
    register: (ns, dicts) => { localeRegistrations.push({ ns, dicts }); return () => {} },
    bind: () => () => '',
  })

  // `configForms` — the settings form provider face.
  ctx.provide('configForms', {
    get: (ns) => {
      formReads.push(ns)
      const state = { value: undefined, revision: 0, writable: true }
      const listeners = new Set()
      return {
        getSnapshot: () => ({ ...state }),
        subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) },
        set: (field, value) => { state.value = { ...state.value, [field]: value }; for (const l of listeners) l() },
      }
    },
  })

  mod.apply(ctx)

  // The plugin registered its dictionaries, bound its form, and mounted all
  // slots. `slotEntries` contains the injected seat names plus the register
  // rows (each seat contributes an entry key and a register key).
  assert.deepEqual(localeRegistrations.map((r) => r.ns), ['clock'])
  assert.ok(formReads.includes('dsh-clock'))
  assert.ok(slotEntries.includes('conversation.composer.dock'))
  assert.ok(slotEntries.includes('conversation.composer.dock:dsh-clock'))
  assert.ok(slotEntries.includes('settings.general.item'))
  assert.ok(slotEntries.includes('settings.general.item:dsh-clock'))
  // Plugins-page row configuration: the row the plugin's own patch declares.
  assert.ok(slotEntries.includes('plugins.row.config'))
  assert.ok(slotEntries.includes('plugins.row.config:dsh-clock#dsh-clock'))
})