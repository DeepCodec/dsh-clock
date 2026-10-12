/**
 * dsh-clock — shared browser styles.
 *
 * Injects the dock and settings-row stylesheets exactly once, stamped with the
 * claimStyles ownership protocol (`data-plugin` / `data-plugin-css`) so the
 * modules browser half cleans them up on HMR. Semantic `--dsw-*` tokens only.
 */

// Compiled with esbuild `loader: { '.css': 'text' }`.
import dockCssText from './clock.css'
import settingsCssText from './ClockSettingsRow.css'

/** Style ownership id; HMR claimants remove tags with this owner. */
export const STYLE_OWNER = 'dsh-clock'

/** Stable class names (carry the dsh-clock- prefix; never collide with shell). */
export const css = {
  // dock
  root: 'dsh-clock-root',
  date: 'dsh-clock-date',
  time: 'dsh-clock-time',
  sep: 'dsh-clock-sep',
  // settings row (also reused by the plugins-page row config)
  section: 'dsh-clock-settings-section',
  head: 'dsh-clock-settings-head',
  headText: 'dsh-clock-settings-headText',
  title: 'dsh-clock-settings-title',
  desc: 'dsh-clock-settings-desc',
  selector: 'dsh-clock-settings-selector',
  chevron: 'dsh-clock-settings-chevron',
  rows: 'dsh-clock-settings-rows',
  row: 'dsh-clock-settings-row',
  rowLabel: 'dsh-clock-settings-rowLabel',
  switch: 'dsh-clock-settings-switch',
  knob: 'dsh-clock-settings-knob',
  number: 'dsh-clock-settings-number',
  // plugins-page row summary (list line) and page form
  rowSummary: 'dsh-clock-row-summary',
}

/** One style tag to inject: owner, tag id, and text. */
const STYLES = [
  { tagId: 'dsh-clock/clock.css', text: dockCssText },
  { tagId: 'dsh-clock/ClockSettingsRow.css', text: settingsCssText },
]

/** Inject each stylesheet once (idempotent), stamped for claimStyles cleanup. */
export function ensureStyles() {
  if (typeof document === 'undefined') return
  for (const { tagId, text } of STYLES) {
    if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) continue
    const tag = document.createElement('style')
    tag.dataset.plugin = STYLE_OWNER
    tag.dataset.pluginCss = tagId
    tag.textContent = text
    ;(document.head ?? document.documentElement).appendChild(tag)
  }
}