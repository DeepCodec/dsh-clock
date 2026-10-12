/**
 * dsh-clock — browser half.
 *
 * Renders the current date & time into the composer dock — the persistent
 * status row at the bottom of the chat view, beside the built-in context
 * meter — and offers a visual configuration row in Settings → General.
 * Pure client-side: `Date` runs locally in the browser, on a
 * user-configurable interval.
 *
 * Conventions followed (per packages/client/AGENTS.md):
 *  - presentation copy lives in a typed locale dictionary (`zh`/`en`) and
 *    reaches components through the standard `t` seat (slot registrations
 *    declare `locale: NS`);
 *  - styles are injected exactly once as `<style data-plugin data-plugin-css>`
 *    tags (the claimStyles ownership protocol) using semantic `--dsw-*` tokens,
 *    never inline styles or literal colors;
 *  - the public export surface is exactly `apply`/`inject` — components,
 *    policies, and dictionaries stay internal;
 *  - live configuration rides the durable settings namespace through the
 *    `configForms` service (ClockPolicy), written from the Settings row.
 *
 * All DOM/runtime wiring failures are logged, never thrown — the web shell
 * fails the whole boot when a plugin apply throws.
 *
 * @module dsh-clock/client
 */

import React, { useEffect, useState } from 'react'
import { formatDate, formatTime } from './clock-core.js'
import { ClockPolicy } from './clock-policy.js'
import { ClockSettingsRow } from './ClockSettingsRow.jsx'
import { ClockRowConfig } from './ClockRowConfig.jsx'
import { SETTINGS_NAMESPACE } from './clock-settings.js'
import { css, ensureStyles } from './styles.js'

/**
 * Services required: the slot registry, locale, and the settings domain's
 * `configForms` transport.
 *
 * Every name here must be a service the web runtime actually provides —
 * a cordis fiber never activates while a declared inject target is missing,
 * and the web-boot audit fails the whole page for a pending entry.
 * `settingsScope` is not a DSH service; the settings form is reached through
 * `configForms` (provided by @deepseek-ai/dsh-client-ui-settings), exactly as
 * dsh-client-locale and dsh-client-ui-conversation do.
 */
export const inject = ['slots', 'locale', 'configForms']

import { en, NS, zh } from './locales.js'

/**
 * The clock widget: a live date/time label for the composer dock. Plain
 * presentation: reactive settings arrive through the registered inject hooks,
 * locale text through the `t` seat.
 */
function Clock({ useClockSettings, t }) {
  const settings = useClockSettings(value => value)
  const [now, setNow] = useState(() => new Date())
  const intervalMs = Math.max(250, settings.intervalMs)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  const date = formatDate(now, t, { weekday: settings.weekday })
  const time = formatTime(now, t, { showSeconds: settings.showSeconds })
  const showDate = settings.mode === 'date' || settings.mode === 'dateTime'
  const showTime = settings.mode === 'time' || settings.mode === 'dateTime'
  const title = [showDate ? date : '', showTime ? time : ''].filter(Boolean).join(' ')
  return (
    <div className={css.root} data-clock title={title} aria-hidden="true">
      {showDate && <span className={css.date}>{date}</span>}
      {showDate && showTime && <span className={css.sep} aria-hidden="true">·</span>}
      {showTime && <span className={css.time}>{time}</span>}
    </div>
  )
}

export function apply(ctx) {
  try {
    ensureStyles()
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-clock: dictionaries')

    const policy = new ClockPolicy(
      ctx.configForms.get(SETTINGS_NAMESPACE),
    )
    ctx.effect(() => () => { policy.dispose() }, 'dsh-clock: settings form')
    const settingsInject = () => ({
      hooks: { clockSettings: policy.settings },
      setMode: (mode) => { policy.setMode(mode) },
      setWeekday: (weekday) => { policy.setWeekday(weekday) },
      setShowSeconds: (showSeconds) => { policy.setShowSeconds(showSeconds) },
      setIntervalMs: (intervalMs) => { policy.setIntervalMs(intervalMs) },
    })

    // Composer dock: the clock itself.
    ctx.slots.inject('conversation.composer.dock', () =>
      ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'dsh-clock',
        order: 10,
        locale: NS,
        inject: settingsInject,
      }, Clock))

    // Settings → General row: visual configuration.
    ctx.slots.inject('settings.general.item', () =>
      ctx.slots.register({
        name: 'settings.general.item',
        id: 'dsh-clock',
        order: 10,
        locale: NS,
        inject: settingsInject,
      }, ClockSettingsRow))

    // Plugins page → row detail: configuration on the plugin's own page.
    // The plugin manager's ledger looks up `plugins.row.config` entries by
    // `bundle#rowId`; the row is the cordis entry our patch declares (id
    // `dsh-clock`), the bundle is `dsh-clock`, so the key is `dsh-clock#dsh-clock`.
    ctx.slots.inject('plugins.row.config', () =>
      ctx.slots.register({
        name: 'plugins.row.config',
        key: 'dsh-clock#dsh-clock',
        order: 10,
        locale: NS,
      }, ClockRowConfig))
  } catch (error) {
    console.error('[dsh-clock] apply failed:', error)
  }
}