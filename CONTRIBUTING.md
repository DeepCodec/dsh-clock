# Contributing to dsh-clock

Thanks for your interest! This project is a small DSH (DeepSeek Harness) web
plugin, but it follows the same discipline the harness itself expects from
client packages (see the [Web client stack rules]
(https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/client/AGENTS.md)).

## Development setup

```sh
pnpm install          # autoInstallPeers=false (set in pnpm-workspace.yaml)
pnpm build            # esbuild dual-half build -> lib/client.js + lib/index.js
pnpm test             # builds, then runs 33 tests (node:test)
```

Node >= 22 is required (see `engines`).

## How to contribute

1. **Open an issue** describing the bug or feature before large changes, so we
   agree on the direction.
2. **Branch from `main`** and keep changes focused: one logical change per
   pull request.
3. **Add or update tests.** The suite mixes:
   - unit tests (pure helpers, `ClockPolicy`, formatters),
   - real-link tests (the built bundle materialized through the DSH module
     table and activated on a real cordis Context),
   - real-contract tests (the actual `dsh-settings` `SettingsForms` service
     against a faithful `configEditor` fake),
   - real-React interaction tests (esbuild-compiled components rendered with
     `react-test-renderer`).
   A change that breaks `pnpm test` will not be merged.
4. **Keep the export surface tight.** The browser half exposes only `apply` /
   `inject` (AGENTS.md export discipline). New UI copy goes into the `zh`/`en`
   dictionaries in `src/client/locales.js` — both languages must carry the
   same key set.
5. **Stay on the official seams.** Inject services must exist on the running
   runtime (0.2.0-rc.2): `slots`, `locale`, `configForms`. Styles use only
   semantic `--dsw-*` tokens and the `data-plugin-css` claim protocol.

## Style

- Plain JavaScript for source; TypeScript only for the host half's
  `src/index.ts`.
- No inline styles in components; CSS lives in `src/client/*.css` with the
  `dsh-clock-` class prefix.
- Comments in English.

## Releasing

1. Bump the version in `package.json` (SemVer).
2. Move the unreleased CHANGELOG entries under the new version with a date.
3. Push a tag: `git tag v<version> && git push origin v<version>`.
4. Create a GitHub Release with the changelog notes.