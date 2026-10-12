/**
 * dsh-clock — host half.
 *
 * Pure-UI plugin whose behaviour lives in the browser half (`./client`), which
 * renders the live date & time into the composer dock (the bottom status row).
 * This host half declares the **live preference form** the clock reads: the
 * fields below are marked `.volatile()`, which is what puts them in the
 * Settings describe mirror (per dsh-settings, a form exposes only volatile
 * fields of an active profile entry). The browser half then binds the same
 * namespace through `ctx.configForms`.
 *
 * Resolution order, per dsh-settings: schema defaults → inherited composition
 * layers → this profile entry's `config` (the layer a Settings write updates).
 *
 * @module dsh-clock
 */

import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings'

export const name = 'dsh-clock'

/**
 * Settings namespace owned by the clock. dsh-settings keys every form by the
 * profile **entry id**, so this must equal the `id:` the bundle patch inserts
 * (see `cordis.patch.yml`) — the browser half reads the same key.
 */
export const SETTINGS_NAMESPACE = 'dsh-clock'

/** User-configurable clock presentation. */
export interface Config {
  /** What the dock shows: date only, time only, or both (default). */
  mode: 'date' | 'time' | 'dateTime'
  /** Include the weekday in the date line. */
  weekday: boolean
  /** Include seconds in the time line. */
  showSeconds: boolean
  /** Refresh interval in milliseconds. */
  intervalMs: number
}

/**
 * Live clock schema.
 *
 * Every field is `.volatile()`: dsh-settings projects a form field only beneath
 * a volatile node, so the same declarations both accept the profile-row
 * `config` and expose the Settings row's live values.
 */
export const Config: Schema<Config> = Schema.object({
  mode: Schema.union(['date', 'time', 'dateTime']).default('dateTime').volatile(),
  weekday: Schema.boolean().default(true).volatile(),
  showSeconds: Schema.boolean().default(true).volatile(),
  intervalMs: Schema.number().min(250).max(60000).default(1000).volatile(),
})

/**
 * Publish the clock's preference form to the Settings service.
 *
 * The clock ships its own Settings row (browser half), so the presentation
 * policy turns automatic page generation off. The nested
 * `ctx.inject(['settings'], …)` — not a top-level `inject` declaration — keeps
 * this plugin activatable on hosts without a settings provider, mirroring the
 * registration shipped by dsh-client-locale and dsh-client-ui-conversation.
 *
 * @param ctx - Host profile context.
 */
export function apply(ctx: import('@deepseek-ai/cordis').Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(
      () => settingsCtx.settings.configure({ auto: false }, ctx.fiber),
      'dsh-clock: settings presentation',
    )
  })
}
