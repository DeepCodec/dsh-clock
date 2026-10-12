/**
 * dsh-clock — Plugins-page row configuration.
 *
 * Renders the clock's four preferences inside the plugin manager's row
 * detail page (`plugins.row.config`). The page hands this component a `form`
 * face shaped `{ state, mutate }` — the configForms controller for the
 * `dsh-clock` settings namespace, exactly the transient `formFor(rowId)`
 * contract the plugin manager derives per row. `view` is `'summary'` (the
 * row's description line) or `'page'` (the detail configuration area).
 *
 * The settings are the SAME durable namespace as the Settings → General row:
 * either surface writes through `form.mutate` and both stay in sync.
 *
 * @module dsh-clock/client/ClockRowConfig
 */

import React, { useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { CLOCK_MODES, FIELD_INTERVAL_MS, FIELD_MODE, FIELD_SHOW_SECONDS, FIELD_WEEKDAY } from './clock-settings.js'
import { css } from './styles.js'

/** Locale keys for the display-mode options, indexed by mode. */
const MODE_LABEL = {
  dateTime: 'settings.mode.dateTime',
  date: 'settings.mode.date',
  time: 'settings.mode.time',
}

/** A field write: `{ op: 'set', path: [field], value }`. */
function setOp(field, value) {
  return [{ op: 'set', path: [field], value }]
}

/**
 * Render the clock's row configuration in the plugin detail page.
 * @param props - `{ view, form, t }`; `form.state` is the settings snapshot,
 *   `form.mutate(ops, revision)` writes through the durable namespace.
 * @returns the summary line or the full form.
 */
export function ClockRowConfig({ view, form, t }) {
  const state = form?.state
  const settings = state?.value

  // Summary view: the row's one-line description.
  if (view === 'summary') {
    return React.createElement('span', { className: css.rowSummary },
      t('settings.description'))
  }

  const [open, setOpen] = useState(false)
  const mutate = (field, value) => { form?.mutate(setOp(field, value), state?.revision) }

  const selectMode = (id) => {
    setOpen(false)
    if (settings?.mode !== id) mutate(FIELD_MODE, id)
  }
  const selector = (
    React.createElement('button',
      {
        type: 'button',
        className: css.selector,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: () => { setOpen(v => !v) },
      },
      t(MODE_LABEL[settings?.mode ?? 'dateTime']),
      React.createElement('span', { className: css.chevron, 'aria-hidden': 'true' }, '▾'),
    )
  )

  return (
    React.createElement('div', { className: css.section, 'data-plugin-config': true },
      React.createElement('div', { className: css.head },
        React.createElement('div', { className: css.headText },
          React.createElement('div', { className: css.title }, t('settings.title')),
          React.createElement('div', { className: css.desc }, t('settings.description')),
        ),
        React.createElement(Menu, {
          open,
          onClose: () => { setOpen(false) },
          items: CLOCK_MODES.map(id => ({ id, label: t(MODE_LABEL[id]) })),
          selectedId: settings?.mode ?? 'dateTime',
          onSelect: selectMode,
          align: 'end',
          portal: true,
          anchor: selector,
        }),
      ),
      React.createElement('div', { className: css.rows },
        React.createElement('label', { className: css.row },
          React.createElement('span', { className: css.rowLabel }, t('settings.weekday.title')),
          React.createElement('button', {
            type: 'button',
            role: 'switch',
            'aria-checked': settings?.weekday ?? true,
            className: css.switch,
            'data-on': (settings?.weekday ?? true) || undefined,
            onClick: () => { mutate(FIELD_WEEKDAY, !(settings?.weekday ?? true)) },
          }, React.createElement('span', { className: css.knob })),
        ),
        React.createElement('label', { className: css.row },
          React.createElement('span', { className: css.rowLabel }, t('settings.seconds.title')),
          React.createElement('button', {
            type: 'button',
            role: 'switch',
            'aria-checked': settings?.showSeconds ?? true,
            className: css.switch,
            'data-on': (settings?.showSeconds ?? true) || undefined,
            onClick: () => { mutate(FIELD_SHOW_SECONDS, !(settings?.showSeconds ?? true)) },
          }, React.createElement('span', { className: css.knob })),
        ),
        React.createElement('label', { className: css.row },
          React.createElement('span', { className: css.rowLabel }, t('settings.interval.title')),
          React.createElement('input', {
            type: 'number',
            className: css.number,
            min: 250,
            max: 60000,
            step: 250,
            value: String(settings?.intervalMs ?? 1000),
            onChange: (event) => { mutate(FIELD_INTERVAL_MS, Number(event.target.value)) },
          }),
        ),
      ),
    )
  )
}