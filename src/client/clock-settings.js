/**
 * dsh-clock — shared settings data consumed by both halves.
 *
 * Pure JSON-shaped data only (namespace id, keys, defaults): the host half
 * owns the Schemastery schema (the `.volatile()` declarations dsh-settings
 * projects into a form), and the browser half binds the same namespace through
 * `ctx.configForms`, which validates sections against the namespace's own wire
 * schema. No runtime import crosses the client purity gate.
 *
 * Plain JavaScript (no TS annotations): consumed by both the host build
 * (esbuild TS strip) and the browser bundle.
 */

/** Settings namespace registered by the clock host half. */
export const SETTINGS_NAMESPACE = 'dsh-clock'

/** Field keys inside the dsh-clock settings section. */
export const FIELD_MODE = 'mode'
export const FIELD_WEEKDAY = 'weekday'
export const FIELD_SHOW_SECONDS = 'showSeconds'
export const FIELD_INTERVAL_MS = 'intervalMs'

/** Clock preference defaults (mirror of the host schema defaults). */
export const DEFAULT_CLOCK_SETTINGS = {
  mode: 'dateTime',
  weekday: true,
  showSeconds: true,
  intervalMs: 1000,
}

/** Accepted display modes, in display order. */
export const CLOCK_MODES = ['dateTime', 'date', 'time']