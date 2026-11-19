# Zero1develop - Circuits

Zero-knowledge circuits for the Zero1develop protocol, built with Circom and Circomkit. The production
Groth16 phase-2 ceremony has not been published yet; see [CEREMONY.md](CEREMONY.md) for its status,
phase-1 parameters and verification requirements.

## Overview

This package contains the core ZK circuits for Zero1develop:

### Helper Templates
- **NoteCommitment**: Computes the cryptographic commitment for a note in the Zero1develop system. This commitment scheme binds ownership, value, and lineage information into a single hash that can be stored in the commitment tree.
- **KeystoreLeaf**: Computes a user's keystore leaf from their public address and private keys. This leaf is stored in the keystore tree and verified during transactions to prove user registration.
- **ValueConservation**: Enforces per-label and global value conservation across transaction inputs and outputs. This is critical for maintaining lineage separation (taint containment) while ensuring economic correctness.

### Main Circuits
- **Deposit**: it proves a commitment was correctly constructed from a set of public and private inputs according to the protocol's commitment scheme.
- **Transact**: spends input notes and creates output notes while enforcing three critical purposes (ASP compliance verification, value conservation (per-label and global), and authorization through keystore membership).

## Circuit Structure

```
circuits/
├── templates/
│   ├── helpers/         # Reusable helper templates
│   │   ├── NoteCommitment.circom
│   │   ├── KeystoreLeaf.circom
│   │   └── ValueConservation.circom
│   ├── Deposit.circom   # Main circuit template
│   └── Transact.circom  # Main circuit template
├── deposit.circom
└── transact.circom
```

**Structure explanation:**
- `templates/helpers/` - Reusable components used by main circuits
- `templates/` - Main circuit template definitions
- Root level - Wrapper files that include templates and declare `component main` for compilation

## Testing Approach

Tests use **Mocha + Chai** with TypeScript support via `ts-node`.

### Test Structure

```
test/
├── common/
│   └── index.ts
├── deposit.test.ts
└── transact.test.ts
```

### Running Tests

```bash
# Run all tests
pnpm test

# Compile a specific circuit
pnpm compile deposit

# Generate development-only proving/verification keys; never deploy them
ALLOW_DEV_KEYS=1 pnpm run setup deposit
```

**Note:** Circuit compilation can take 1-5 minutes. Mocha is configured with a 300s (5 minute) timeout.

## Static Analysis

Circuits are analyzed with **circomspect** to catch security issues.

### Installation

```bash
cargo install circomspect
```

### Running Analysis

```bash
# Analyze all circuits
pnpm lint

# Verbose output with warnings
circomspect circuits/ --verbose --include-warnings --allow P1000
```

The `--allow P1000` flag is standard practice for certain non-critical warnings.

## CI/CD Integration

Circuits are validated in CI pipeline:
1. **Lint Job**: Checks code style (runs first)
2. **Circomspect Job**: Static analysis (runs after lint)
3. **Build Circuits Job**: Compiles circuits and runs tests

Circomspect failures will **block the CI pipeline**.

## Required Tools

- **Circom**: Circuit compiler (v2.2.3)
- **Circomkit**: Circuit development framework
- **Node.js**: >=18.0.0
- **pnpm**: Package manager
- **Rust/Cargo**: For circomspect installation

## Build Artifacts

Generated circuit artifacts are written to `build/` and excluded from Git:
```
build/
├── deposit/
│   ├── groth16_pkey.zkey      # development key or verified ceremony key
│   ├── groth16_vkey.json      # matching verification key
│   ├── groth16_verifier.sol   # exported from the keys by `pnpm build`
│   └── deposit.r1cs
└── ...
```

Production artifacts must be downloaded from a future verified ceremony release. Keys are bound to the
exact `.r1cs`; any constraint-system change requires a new phase-2 ceremony for the affected circuit.

## Reference Documentation

- [Circom Documentation](https://docs.circom.io/)
- [Circomkit GitHub](https://github.com/erhant/circomkit)
- [Circomspect GitHub](https://github.com/trailofbits/circomspect)

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm test` | Run all tests with Mocha |
| `pnpm lint` | Run circomspect static analysis |
| `pnpm build` | Export Solidity verifiers from keys currently present in `build/` |
| `pnpm compile <circuit>` | Compile a specific circuit |
| `pnpm compile:all` | Compile all circuits declared in `circuits.json` |
| `ALLOW_DEV_KEYS=1 pnpm run setup <circuit>` | Generate single-contributor development keys (`setup:all` for all circuits) |
| `pnpm prove <circuit>` | Generate proof |
| `pnpm verify <circuit>` | Verify proof |
| `pnpm verify:artifacts` | Verify all frozen `build/` files against `artifacts.sha256` and list missing or mismatched files |
| `pnpm clean` | Remove build artifacts |
