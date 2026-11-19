# Changelog

All notable changes to `@zero1develop/circuits` are documented in this file.

## Unreleased

- Document the planned multi-party trusted setup for all 26 circuits. Production ceremony artifacts
  have not been published yet; provenance and verification requirements are in `CEREMONY.md`.
- Require `ALLOW_DEV_KEYS=1` for `setup` and `setup:all` so locally generated keys cannot be mistaken
  for production ceremony output.

## 1.0.0 — 2026-10-19

Initial release.

- Circom/Circomkit zero-knowledge circuits: `Deposit` and `Transact` (one circuit per input × output
  count, `1x1` to `5x5`), built on the `NoteCommitment`, `KeystoreLeaf` and `ValueConservation`
  helper templates.
- Generated build artifacts are excluded from Git until verified production ceremony artifacts are
  published through the ceremony repository.
