# Student 2192 - Homework 2

## Task Overview

1. **Address Conversion**: Implement conversion between SS58 (Substrate) and EVM addresses, and verify balance consistency
2. **Precompile Call**: Select and call an EVM precompile contract

## Prerequisites

```bash
# Install dependencies
npm install

# Generate Polkadot API descriptors
npx papi
```

## Running the Tests

### Task 1: Address Conversion & Balance Check

```bash
npm run task1
# or
npx tsx src/task1-address-conversion.ts
```

This script demonstrates:
- Converting SS58 addresses to EVM format
- Converting EVM addresses to SS58 format
- Checking balance via Polkadot API (Substrate) and ethers/viem (EVM)
- Verifying address conversion roundtrip consistency

### Task 2: Precompile Calls

```bash
npm run task2
# or
npx tsx src/task2-precompile.ts
```

This script demonstrates calling EVM precompiles:
- **Identity (0x04)**: Returns input data unchanged
- **RIPEMD160 (0x03)**: Computes RIPEMD160 hash
- **SHA256 (0x02)**: Computes SHA256 hash

## Implementation Details

### Address Conversion

1. **SS58 -> EVM**: Uses Keccak256 hash of the public key, taking the last 20 bytes
2. **EVM -> SS58**: For eth-derived addresses (with 0xEE prefix), extracts the first 20 bytes; otherwise hashes the public key

### Libraries Used

- **ethers.js**: EVM RPC calls and address utilities
- **viem**: Alternative EVM client for comparison
- **polkadot-api**: Substrate/Polkadot API client
- **@polkadot/util-crypto**: SS58 address encoding/decoding

## Network

Connected to Polkadot Paseo testnet (Asset Hub):
- RPC: `https://paseo-rpc.dwellir.com`
- WSS: `wss://asset-hub-paseo-rpc.polkadot.io`
