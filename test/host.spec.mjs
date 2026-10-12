/**
 * dsh-clock host-half tests.
 *
 * Runs against the built `lib/index.js`:
 *  - the plugin identity (name/apply) is loadable and activatable without a
 *    settings provider (nested inject);
 *  - apply publishes the clock's preference form through the real
 *    `settings.configure({ auto: false }, fiber)` API (a `settings.register`
 *    call does not exist in dsh-settings and silently never persisted);
 *  - every Config field is volatile, which is what puts it in the Settings
 *    describe mirror, and the schema carries the documented defaults,
 *    bounds, and rejection rules.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

/** Unwrap a schemastery `.volatile()` value for assertions. */
const plain = (value) => (value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value)

test('host half exports the cordis plugin shape', async () => {
  const mod = await import('../lib/index.js')
  assert.equal(mod.name, 'dsh-clock')
  assert.equal(mod.SETTINGS_NAMESPACE, 'dsh-clock')
  assert.equal(typeof mod.apply, 'function')
})

test('apply is activatable without a settings provider', async () => {
  const mod = await import('../lib/index.js')
  let nestedCalled = false
  const ctx = {
    fiber: { uid: 1 },
    inject: (names, cb) => {
      assert.deepEqual(names, ['settings'])
      nestedCalled = true
      // No settings provider: the nested inject simply never fires, so
      // applying must not throw and must not block.
    },
  }
  mod.apply(ctx)
  assert.equal(nestedCalled, true)
})

test('apply publishes the form through settings.configure', async () => {
  const mod = await import('../lib/index.js')
  const calls = []
  const fiber = { uid: 7 }
  let nested = null
  const ctx = {
    fiber,
    inject: (_names, cb) => {
      nested = cb
      return () => {}
    },
  }
  mod.apply(ctx)
  assert.equal(typeof nested, 'function')

  const settingsCtx = {
    settings: {
      // The only presentation API dsh-settings exposes on the `settings`
      // service; there is deliberately no `register`.
      configure: (presentation, owner) => {
        calls.push({ presentation, owner })
        return () => {}
      },
    },
    effect: (cb) => {
      const disposer = cb()
      assert.equal(typeof disposer, 'function')
      return () => disposer()
    },
  }
  nested(settingsCtx)

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].presentation, { auto: false })
  // The policy is registered against this plugin's own fiber.
  assert.equal(calls[0].owner, fiber)
})

test('Config exposes every field as volatile with documented defaults', async () => {
  const mod = await import('../lib/index.js')
  const schema = mod.Config

  // dsh-settings builds a form only from volatile fields; a non-volatile
  // field would drop the whole entry out of the describe mirror.
  assert.deepEqual(
    Object.fromEntries(Object.entries(schema.dict).map(([key, node]) => [key, node.meta.volatile === true])),
    { mode: true, weekday: true, showSeconds: true, intervalMs: true },
  )

  const defaults = schema({})
  assert.equal(plain(defaults.mode), 'dateTime')
  assert.equal(plain(defaults.weekday), true)
  assert.equal(plain(defaults.showSeconds), true)
  assert.equal(plain(defaults.intervalMs), 1000)

  const override = schema({ mode: 'time', showSeconds: false, intervalMs: 2000 })
  assert.equal(plain(override.mode), 'time')
  assert.equal(plain(override.showSeconds), false)
  assert.equal(plain(override.intervalMs), 2000)
})

test('Config schema rejects invalid values', async () => {
  const mod = await import('../lib/index.js')
  const schema = mod.Config
  assert.throws(() => schema('bogus'))
  assert.throws(() => schema({ mode: 'bogus' }))
  assert.throws(() => schema({ intervalMs: 10 }))
  assert.throws(() => schema({ intervalMs: 60001 }))
})
