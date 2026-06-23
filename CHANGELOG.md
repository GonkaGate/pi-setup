# Changelog

## Unreleased

### Features

- Add v2 Pi setup flow with curated model selection, safe API-key intake via
  `GONKAGATE_API_KEY`, `--api-key-stdin`, or a hidden prompt, Pi `auth.json`
  storage, and Pi default model settings.

### Security

- Keep plain `--api-key` unsupported and redact accidental `gp-...` keys from
  user-facing error output.

## [0.2.2](https://github.com/GonkaGate/pi-setup/compare/v0.2.1...v0.2.2) (2026-06-23)


### Bug Fixes

* make setup command non-interactive ([66aa585](https://github.com/GonkaGate/pi-setup/commit/66aa585032ab53e5ca668eeb8c728bd81d8eb2e4))

## [0.2.1](https://github.com/GonkaGate/pi-setup/compare/v0.2.0...v0.2.1) (2026-06-23)


### Bug Fixes

* read CLI version from package metadata ([e27a2de](https://github.com/GonkaGate/pi-setup/commit/e27a2de2b657ce0bc65615fd02979e0ad0e9e220))

## [0.2.0](https://github.com/GonkaGate/pi-setup/compare/v0.1.0...v0.2.0) (2026-06-23)


### Features

* implement pi setup CLI ([fb13f9b](https://github.com/GonkaGate/pi-setup/commit/fb13f9bdf9565ed7631c5b0b388a06c8d63dd8d9))

## 0.1.0

- Initial development scaffold for `@gonkagate/pi-setup`.
