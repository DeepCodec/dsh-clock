# Pull Request

Thank you for contributing to dsh-clock! Please fill in the details below.

## Summary

<!-- What does this PR do? One or two sentences. -->

## Related issue

<!-- Link the issue this PR closes, e.g. Fixes #12 -->

## Changes

- [ ] Browser half (`src/client/`) change
- [ ] Host half (`src/index.ts`) change
- [ ] Tests added/updated
- [ ] Locale dictionaries (`zh` and `en`) both updated with the same keys
- [ ] README / CHANGELOG updated

## Checklist

- [ ] `pnpm test` passes (build + full suite)
- [ ] Export surface of the browser half is still only `apply` / `inject`
- [ ] New UI copy goes through the `t` seat (no hard-coded product strings)
- [ ] Styles use semantic `--dsw-*` tokens (no inline styles, no literal colors)
- [ ] No network/file/code-execution additions beyond the settings form

## Screenshots (if UI change)

<!-- Add screenshots of the widget and/or the Settings row. -->