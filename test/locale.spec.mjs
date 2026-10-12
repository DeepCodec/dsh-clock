/**
 * dsh-clock locale dictionary consistency tests.
 *
 * The clock and its Settings row render product-visible copy exclusively
 * through the `zh`/`en` dictionaries registered with `ctx.locale`. The two
 * dictionaries must carry the SAME key set — a key added to one locale and
 * forgotten in the other renders the raw key to half the users.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { en, NS, zh } from '../src/client/locales.js'

test('zh and en dictionaries carry the same key set', () => {
  const zhKeys = Object.keys(zh).sort()
  const enKeys = Object.keys(en).sort()
  assert.deepEqual(zhKeys, enKeys, 'zh and en must share every dictionary key')
  assert.ok(zhKeys.length > 0)
})

test('every dictionary key the components reference is present', async () => {
  const { readFile } = await import('node:fs/promises')
  // Collect literal t('...') keys from the JSX sources.
  const sources = [
    await readFile(new URL('../src/client/index.jsx', import.meta.url), 'utf8'),
  ]
  const keys = new Set()
  for (const source of sources) {
    for (const match of source.matchAll(/t\('([a-z][a-z0-9.]*)'\)/g)) keys.add(match[1])
  }
  for (const key of keys) {
    assert.ok(key in zh, `zh is missing component key "${key}"`)
    assert.ok(key in en, `en is missing component key "${key}"`)
  }
})

test('namespace is stable and non-empty', () => {
  assert.equal(NS, 'clock')
})