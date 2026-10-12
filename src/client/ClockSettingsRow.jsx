/**
 * dsh-clock — Settings → General preference row.
 *
 * Visual configuration for the dock clock: display mode (menu), weekday and
 * seconds toggles, and the refresh interval. Mirrors ui-chat's
 * TranscriptViewRow: the row draws its own internals; the durable Host write
 * happens through the inject callbacks (ClockPolicy), and the reactive value
 * arrives through the `useClockSettings` hooks compartment.
 *
 * @module dsh-clock/client/ClockSettingsRow
 */

import React, { useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { CLOCK_MODES } from './clock-settings.js'
import { css } from './styles.js'

/** Locale keys for the display-mode options, indexed by mode. */
const MODE_LABEL = {
  dateTime: 'settings.mode.dateTime',
  date: 'settings.mode.date',
  time: 'settings.mode.time',
}

/**
 * Render the clock preference row in Settings → General.
 * @param props - composed Settings slot props (hooks + callbacks + locale seat).
 * @returns the preference row.
 */
export function ClockSettingsRow({ useClockSettings, setMode, setWeekday, setShowSeconds, setIntervalMs, t }) {
  const settings = useClockSettings(value => value)
  const [open, setOpen] = useState(false)

  const selectMode = (id) => {
    setOpen(false)
    setMode?.(id)
  }
  const selector = (
    <button
      type="button"
      className={css.selector}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => { setOpen(value => !value) }}
    >
      {t(MODE_LABEL[settings.mode])}
      <span className={css.chevron} aria-hidden="true">▾</span>
    </button>
  )

  return (
    <div className={css.section}>
      <div className={css.head}>
        <div className={css.headText}>
          <div className={css.title}>{t('settings.title')}</div>
          <div className={css.desc}>{t('settings.description')}</div>
        </div>
        <Menu
          open={open}
          onClose={() => { setOpen(false) }}
          items={CLOCK_MODES.map(id => ({ id, label: t(MODE_LABEL[id]) }))}
          selectedId={settings.mode}
          onSelect={selectMode}
          align="end"
          portal
          anchor={selector}
        />
      </div>

      <div className={css.rows}>
        <label className={css.row}>
          <span className={css.rowLabel}>{t('settings.weekday.title')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.weekday}
            className={css.switch}
            data-on={settings.weekday || undefined}
            onClick={() => { setWeekday?.(!settings.weekday) }}
          >
            <span className={css.knob} />
          </button>
        </label>

        <label className={css.row}>
          <span className={css.rowLabel}>{t('settings.seconds.title')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showSeconds}
            className={css.switch}
            data-on={settings.showSeconds || undefined}
            onClick={() => { setShowSeconds?.(!settings.showSeconds) }}
          >
            <span className={css.knob} />
          </button>
        </label>

        <label className={css.row}>
          <span className={css.rowLabel}>{t('settings.interval.title')}</span>
          <input
            type="number"
            className={css.number}
            min={250}
            max={60000}
            step={250}
            value={String(settings.intervalMs)}
            onChange={(event) => { setIntervalMs?.(Number(event.target.value)) }}
          />
        </label>
      </div>
    </div>
  )
}