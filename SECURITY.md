# Security Policy

## Reporting a vulnerability

This plugin renders local date/time data only: it performs **no network
requests** (after the config read), **no file access**, and **no code
execution** beyond the browser half it ships. The attack surface is limited to
what the DSH web shell already runs.

Still, if you find a security issue — for example, a way the plugin's rendered
content or settings handling could leak data, cause a crash, or be exploited
through the composer dock or Settings row — please report it privately instead
of opening a public issue:

- **Email:** longshan.du@gmail.com
- **Subject prefix:** `[dsh-clock security]`

Please include:

- the DSH runtime version and plugin version,
- reproduction steps (minimal if possible),
- the impact you observed or suspect.

## Response

- **Acknowledgment:** within 3 business days.
- **Triage and fix:** a patch is prepared on the `main` branch as soon as
  possible, and a release is cut with the fix.
- **Disclosure:** once the fix is released, we publish an advisory and credit
  the reporter unless they prefer anonymity.

## Scope

- In scope: `src/`, `build.mjs`, `cordis.patch.yml`, and the built artifacts
  they produce.
- Out of scope: the DSH runtime itself (report to
  deepseek-ai/deepseek-harness upstream), third-party dependencies, and issues
  already covered by the platform's own security policy.