/**
 * dsh-clock — browser-half formatting helpers.
 *
 * Pure functions, separated from the presentation component so the date/time
 * layout can be unit-tested without a DOM or React.
 *
 * @module dsh-clock/client/clock-core
 */

/** Zero-pad a number to two digits. */
export function pad(n) {
  return String(n).padStart(2, '0')
}

/** Weekday-name dictionary keys (indexed by Date#getDay()); values live in the locale dict. */
export const WEEKDAY_KEYS = ['dock.weekday.0', 'dock.weekday.1', 'dock.weekday.2', 'dock.weekday.3', 'dock.weekday.4', 'dock.weekday.5', 'dock.weekday.6']

/**
 * Format a Date as a date line.
 * @param d - the instant to format.
 * @param t - the locale `t` seat for the clock namespace.
 * @param opts - formatting options.
 * @returns the localized date text.
 */
export function formatDate(d, t, opts = {}) {
  const year = String(d.getFullYear())
  const month = String(d.getMonth() + 1)
  const day = String(d.getDate())
  const weekday = t(`dock.weekday.${d.getDay()}`)
  let text = t('dock.date', { year, month, day })
  if (opts.weekday !== false) {
    text = `${text} ${t('dock.weekday', { weekday })}`
  }
  return text
}

/**
 * Format a Date as a time line.
 * @param d - the instant to format.
 * @param t - the locale `t` seat for the clock namespace.
 * @param opts - formatting options.
 * @returns the localized time text.
 */
export function formatTime(d, t, opts = {}) {
  const hour = pad(d.getHours())
  const minute = pad(d.getMinutes())
  const second = pad(d.getSeconds())
  const seconds = opts.showSeconds === false ? '' : t('dock.seconds', { second })
  return t('dock.time', { hour, minute, seconds })
}