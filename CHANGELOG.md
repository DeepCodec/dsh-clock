# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Plugins-page row configuration (`plugins.row.config`): configure the clock
  from the plugin manager's row detail page, beside the Settings → General row.
- Repository community files: LICENSE (MIT), CONTRIBUTING, SECURITY,
  GitHub issue/PR templates, and a CI workflow (build + test on every push/PR).

### Fixed

- Real-cordis activation coverage: the `settingsScope` regression (a
  non-existent inject target that left the browser fiber pending and failed
  web boot) is now guarded by a real cordis activation test plus artifact
  audits.

## [1.0.0] - 2026-10-12

### Added

- DSH web plugin showing the current date & time in the composer dock (the
  bottom status bar), ticking locally with no model or network involvement.
- Visual configuration in Settings → General (display mode, weekday, seconds,
  refresh interval), persisted through the platform `dsh-settings` form
  (`configForms`) into the profile document.
- Voluntary config via the profile patch layer as the settings composition
  base.
- Full localization: zh/en dictionaries with identical key sets.
- 33 automated tests: host contract, ClockPolicy unit, real-cordis
  activation, real dsh-settings pipeline, real-React component interaction,
  locale consistency, and built-artifact audits.