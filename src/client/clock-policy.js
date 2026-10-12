/**
 * dsh-clock — browser-half settings policy.
 *
 * Wraps the durable `dsh-clock` settings form as a reactive store the Clock
 * widget and the Settings row share: reads ride the form snapshot, explicit
 * user choices write through `host.set`. Mirrors ui-chat's
 * ComposerSubmissionPolicy
 * (client/ui-chat/src/client/composer-submission-policy.ts).
 *
 * Plain JavaScript: `configForms` is a cordis service provided at runtime
 * (browser baseline), not a module import; `createSnapshotStore` IS a baseline
 * module, imported normally.
 */

import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  CLOCK_MODES,
  DEFAULT_CLOCK_SETTINGS, FIELD_INTERVAL_MS, FIELD_MODE, FIELD_SHOW_SECONDS, FIELD_WEEKDAY,
} from './clock-settings.js'

/** Sanitize an interval to the schema range (same clamp the host schema enforces). */
function clampInterval(value) {
  if (!Number.isFinite(value)) return DEFAULT_CLOCK_SETTINGS.intervalMs
  return Math.min(60000, Math.max(250, Math.round(value)))
}

/**
 * Live clock preference: a SnapshotStore seeded with defaults, adopted from
 * the Host form as it arrives, and written back on explicit changes.
 */
export class ClockPolicy {
  /** Reactive current settings; defaults before Host settings arrive. */
  settings = createSnapshotStore({ ...DEFAULT_CLOCK_SETTINGS })

  /** Host form subscription, released by {@link dispose}. */
  unsubscribe

  /**
   * @param host - durable dsh-clock settings form from `ctx.configForms.get`.
   *   Absent compositions (no settings provider) keep the local defaults.
   */
  constructor(host) {
    this.host = host
    if (host !== undefined) {
      this.unsubscribe = host.subscribe(() => { this.adopt() })
      this.adopt()
    }
  }

  /** Release the host form subscription; the owning effect calls this. */
  dispose() {
    this.unsubscribe?.()
    this.unsubscribe = undefined
  }

  /** Change the display mode (date/time/both). */
  setMode(mode) {
    const current = this.settings.getSnapshot()
    if (current.mode === mode) return
    this.settings.set({ ...current, mode })
    void this.host?.set(FIELD_MODE, mode)
  }

  /** Toggle the weekday in the date line. */
  setWeekday(weekday) {
    const current = this.settings.getSnapshot()
    if (current.weekday === weekday) return
    this.settings.set({ ...current, weekday })
    void this.host?.set(FIELD_WEEKDAY, weekday)
  }

  /** Toggle seconds in the time line. */
  setShowSeconds(showSeconds) {
    const current = this.settings.getSnapshot()
    if (current.showSeconds === showSeconds) return
    this.settings.set({ ...current, showSeconds })
    void this.host?.set(FIELD_SHOW_SECONDS, showSeconds)
  }

  /** Set the refresh interval in milliseconds. */
  setIntervalMs(intervalMs) {
    const current = this.settings.getSnapshot()
    const next = clampInterval(intervalMs)
    if (current.intervalMs === next) return
    this.settings.set({ ...current, intervalMs: next })
    void this.host?.set(FIELD_INTERVAL_MS, next)
  }

  /** Adopt the latest accepted Host section without writing it back. */
  adopt() {
    const section = this.host?.getSnapshot().value
    if (section === undefined) return
    const current = this.settings.getSnapshot()
    const next = { ...current }
    let changed = false
    if (CLOCK_MODES.includes(section.mode)) {
      if (next.mode !== section.mode) { next.mode = section.mode; changed = true }
    }
    if (typeof section.weekday === 'boolean' && next.weekday !== section.weekday) { next.weekday = section.weekday; changed = true }
    if (typeof section.showSeconds === 'boolean' && next.showSeconds !== section.showSeconds) { next.showSeconds = section.showSeconds; changed = true }
    // The host wire schema already clamps its accepted section; treat an
    // out-of-range value here as invalid and keep the current setting (never
    // silently invent a value the host did not accept).
    if (typeof section.intervalMs === 'number' && Number.isFinite(section.intervalMs)
      && section.intervalMs >= 250 && section.intervalMs <= 60000
      && next.intervalMs !== section.intervalMs) {
      next.intervalMs = section.intervalMs
      changed = true
    }
    if (changed) this.settings.set(next)
  }
}