/**
 * dsh-clock — locale dictionaries for the browser half.
 *
 * Plain JavaScript so the key-set invariant (zh and en carry the SAME keys)
 * is testable without JSX compilation. The clock entry registers these
 * through `ctx.locale.register(NS, { zh, en })`.
 *
 * @module dsh-clock/client/locales
 */

/** Locale namespace owning the clock's copy. */
export const NS = 'clock'

/** Simplified Chinese dictionary; the key-set source of truth. */
export const zh = {
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
  'settings.title': '时钟',
  'settings.description': '在底部状态栏显示当前日期与时间',
  'settings.mode.dateTime': '日期 + 时间',
  'settings.mode.date': '仅日期',
  'settings.mode.time': '仅时间',
  'settings.weekday.title': '显示星期几',
  'settings.seconds.title': '显示秒',
  'settings.interval.title': '刷新间隔（毫秒）',
}

/** English dictionary; same key set as zh. */
export const en = {
  'dock.date': '{month}/{day}/{year}',
  'dock.weekday': '{weekday}',
  'dock.weekday.0': 'Sun',
  'dock.weekday.1': 'Mon',
  'dock.weekday.2': 'Tue',
  'dock.weekday.3': 'Wed',
  'dock.weekday.4': 'Thu',
  'dock.weekday.5': 'Fri',
  'dock.weekday.6': 'Sat',
  'dock.time': '{hour}:{minute}{seconds}',
  'dock.seconds': ':{second}',
  'settings.title': 'Clock',
  'settings.description': 'Show the current date & time in the bottom status bar',
  'settings.mode.dateTime': 'Date + time',
  'settings.mode.date': 'Date only',
  'settings.mode.time': 'Time only',
  'settings.weekday.title': 'Show weekday',
  'settings.seconds.title': 'Show seconds',
  'settings.interval.title': 'Refresh interval (ms)',
}