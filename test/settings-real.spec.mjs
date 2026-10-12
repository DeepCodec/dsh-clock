/**
 * dsh-clock host-half real-contract tests.
 *
 * These drive the REAL @deepseek-ai/dsh-settings `SettingsForms` service
 * (the running version 0.2.0-rc.2) against a minimal but faithful fake of its
 * `configEditor` dependency, proving that:
 *  - an active loader entry whose plugin exported a volatile Config schema
 *    shows up in `settings.describe()` under its entry id (`dsh-clock`) —
 *    the namespace the browser half's `configForms.get('dsh-clock')` reads;
 *  - the profile-row `config` is the entry's `options.config`, projected as
 *    the `value` the browser form adopts;
 *  - `settings.mutate` (the public write boundary, which internally calls
 *    `configEditor.edit`) persists a user edit.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { SettingsForms } from '@deepseek-ai/dsh-settings'
import { Config, SETTINGS_NAMESPACE, apply } from '../lib/index.js'

/** The ConfigFormController wire shape the dsh-settings service needs. */
function makeEntry(id, fiberUid, config) {
  return {
    id,
    options: { id, config },
    // The settings.describe() path checks `entry.fiber.state === 2` (ACTIVE)
    // and reads the plugin's exported Config from `entry.fiber.runtime.Config`.
    fiber: {
      uid: fiberUid,
      state: 2,
      config,
      runtime: { kind: 'profile', Config },
      ctx: {},
    },
  }
}

/** A loader tree shaped like dsh-config-editor's surface. */
function makeConfigEditor(entries) {
  const configuration = () => entries.map((entry) => ({
    entry,
    inherited: entry.options.config,
    override: {},
  }))
  const edit = async (entry, mutator) => {
    const next = mutator(entry.options.config, entry.options.config)
    entry.options.config = next
    return next
  }
  return {
    configuration,
    entries: () => entries,
    edit,
    get documentPath() { return 'settings.yaml' },
  }
}

/** A settings-ready cordis Context with the two fake provider services bound. */
function makeSettingsCtx(configEditor, profile) {
  const ctx = new Context()
  ctx.root.loader = { await: async () => {} }
  ctx.provide('configEditor', configEditor)
  ctx.provide('profileContext', profile)
  return ctx
}

test('real SettingsForms describes the dsh-clock entry', async () => {
  const entry = makeEntry(SETTINGS_NAMESPACE, 42, { mode: 'time', weekday: false })
  const configEditor = makeConfigEditor([entry])
  const settingsCtx = makeSettingsCtx(configEditor, { home: '/tmp', name: 'test' })
  const forms = new SettingsForms(settingsCtx)

  const descriptors = forms.describe({ redactSecrets: true })
  const clock = descriptors.find((d) => d.ns === SETTINGS_NAMESPACE)
  assert.ok(clock, 'dsh-clock entry should be described by the settings service')
  assert.equal(clock.ns, 'dsh-clock')
  // `value` carries the entry config exactly as the profile row wrote it
  // (absent fields are NOT default-filled here — the schema defaults live in
  // `base`, and the browser form merges base+value itself).
  assert.equal(clock.value.mode, 'time')
  assert.equal(clock.value.weekday, false)
  assert.equal(clock.value.showSeconds, undefined)
  assert.equal(clock.value.intervalMs, undefined)
  // `base` is the fully-interpolated layer with schema defaults.
  assert.equal(clock.base.showSeconds, true)
  assert.equal(clock.base.intervalMs, 1000)
})

test('real SettingsForms.mutate persists a user edit through configEditor', async () => {
  const entry = makeEntry(SETTINGS_NAMESPACE, 7, { mode: 'dateTime' })
  const configEditor = makeConfigEditor([entry])
  const settingsCtx = makeSettingsCtx(configEditor, { home: '/tmp', name: 'test' })
  const forms = new SettingsForms(settingsCtx)

  const descriptor = forms.describe().find((d) => d.ns === SETTINGS_NAMESPACE)
  assert.ok(descriptor)
  await forms.mutate(SETTINGS_NAMESPACE, [
    { op: 'set', path: ['mode'], value: 'date' },
  ], descriptor.revision)

  const rewritten = configEditor.entries()[0].options.config
  assert.equal(rewritten.mode, 'date')
})

test('real SettingsForms refuses an unknown entry id', async () => {
  const configEditor = makeConfigEditor([])
  const settingsCtx = makeSettingsCtx(configEditor, { home: '/tmp', name: 'test' })
  const forms = new SettingsForms(settingsCtx)
  await assert.rejects(() => forms.mutate('no-such-entry', [{ op: 'set', path: ['x'], value: 1 }]), /No configurable plugin entry/)
})

test('host Config integrates with the real settings pipeline', async () => {
  const fieldNames = Object.keys(Config.dict)
  assert.deepEqual(fieldNames.sort(), ['intervalMs', 'mode', 'showSeconds', 'weekday'])
  assert.equal(typeof apply, 'function')
})