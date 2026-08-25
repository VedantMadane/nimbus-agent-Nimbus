## Summary

Remove leaked temp directories from gateway test suites

## Changes

- Clean temp dirs in packages/gateway/test/fixtures/extension.ts
- Clean temp dirs in packages/gateway/src/db/tar-bundle.test.ts
- Register mkdtemp paths and rmSync them in afterEach

Fixes #972
