## Convert
```bash
> homework2@1.0.0 task1
> tsx src/convert.ts

=== Task1: Address convert + balance consistency ===
Network: Westend Asset Hub testnet

[Address conversion]
H160: 0x5c434e203265949d679ec97b950dacf4e4d2e17e
SS58: 5E9gFpg3dBonbkn6TinMNUZ1CQyyvuEkkPXXBJJbVnPieKUR
SS58 -> H160: 0x5c434E203265949d679Ec97b950dAcf4E4D2E17e
Round-trip check: PASS
2026-04-27 23:18:53        REGISTRY: Unknown signed extensions AuthorizeCall, EthSetOrigin, StorageWeightReclaim found, treating them as no-effect
2026-04-27 23:18:53        API/INIT: RPC methods not decorated: archive_v1_body, archive_v1_call, archive_v1_finalizedHeight, archive_v1_genesisHash, archive_v1_hashByHeight, archive_v1_header, archive_v1_stopStorage, archive_v1_storage, archive_v1_storageDiff, archive_v1_storageDiff_stopStorageDiff, author_rotateKeysWithOwner, chainHead_v1_body, chainHead_v1_call, chainHead_v1_continue, chainHead_v1_follow, chainHead_v1_header, chainHead_v1_stopOperation, chainHead_v1_storage, chainHead_v1_unfollow, chainHead_v1_unpin, chainSpec_v1_chainName, chainSpec_v1_genesisHash, chainSpec_v1_properties, transactionWatch_v1_submitAndWatch, transactionWatch_v1_unwatch, transaction_v1_broadcast, transaction_v1_stop

[Balance query]
ethers balance (wei): 0
viem balance   (wei): 0
PAPI free   (planck): 0
PAPI scaled  (wei*): 0

[Consistency check]
ethers vs viem: PASS
EVM vs PAPI (scaled, tolerance=0.01): PASS
difference (wei): 0
ethers formatted: 0
```

## Precompile
```bash


> homework2@1.0.0 task2
> tsx src/precompile.ts

=== Task2: Precompile call ===
Network: Westend Asset Hub testnet
Precompile: 0x0000000000000000000000000000000000000002 (SHA256)

Input text: hello-polkadot-testnet
Input hex : 0x68656c6c6f2d706f6c6b61646f742d746573746e6574
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)

[Fallback attempts]
- ethers failed @ https://westend-asset-hub-eth-rpc.polkadot.io: missing revert data (action="call", data=null, reason=null, transaction={ "data": "0x68656c6c6f2d706f6c6b61646f742d746573746e6574", "to": "0x0000000000000000000000000000000000000002" }, invocation=null, revert=null, code=CALL_EXCEPTION, version=6.16.0)
- ethers failed @ https://westend-asset-hub-rpc.polkadot.io: missing revert data (action="call", data=null, reason=null, transaction={ "data": "0x68656c6c6f2d706f6c6b61646f742d746573746e6574", "to": "0x0000000000000000000000000000000000000002" }, invocation=null, revert=null, code=CALL_EXCEPTION, version=6.16.0)
- ethers failed @ https://westend-asset-hub-rpc.dwellir.com: getaddrinfo ENOTFOUND westend-asset-hub-rpc.dwellir.com
- viem failed @ https://westend-asset-hub-eth-rpc.polkadot.io: Missing or invalid parameters.
Double check you have provided the correct parameters.

URL: https://westend-asset-hub-eth-rpc.polkadot.io
Request body: {"method":"eth_call","params":[{"data":"0x68656c6c6f2d706f6c6b61646f742d746573746e6574","to":"0x0000000000000000000000000000000000000002"},"latest"]}
 
Raw Call Arguments:
  to:    0x0000000000000000000000000000000000000002
  data:  0x68656c6c6f2d706f6c6b61646f742d746573746e6574

Details: Metadata error: The generated code is not compatible with the node
Version: viem@2.48.4
- viem failed @ https://westend-asset-hub-rpc.polkadot.io: The method "eth_call" does not exist / is not available.

URL: https://westend-asset-hub-rpc.polkadot.io
Request body: {"method":"eth_call","params":[{"data":"0x68656c6c6f2d706f6c6b61646f742d746573746e6574","to":"0x0000000000000000000000000000000000000002"},"latest"]}
 
Raw Call Arguments:
  to:    0x0000000000000000000000000000000000000002
  data:  0x68656c6c6f2d706f6c6b61646f742d746573746e6574

Details: Method not found
Version: viem@2.48.4
- viem failed @ https://westend-asset-hub-rpc.dwellir.com: HTTP request failed.

URL: https://westend-asset-hub-rpc.dwellir.com/
Request body: {"method":"eth_call","params":[{"data":"0x68656c6c6f2d706f6c6b61646f742d746573746e6574","to":"0x0000000000000000000000000000000000000002"},"latest"]}
 
Raw Call Arguments:
  to:    0x0000000000000000000000000000000000000002
  data:  0x68656c6c6f2d706f6c6b61646f742d746573746e6574

Details: fetch failed
Version: viem@2.48.4

ethers output: (no result)
ethers rpc   : (none succeeded)
viem output  : (no result)
viem rpc     : (none succeeded)
local sha256 : 0x5977112e9ae35e07a45820ebda8e00d643b4188b05a7e855f9a7a9b668b780f2

Verification:
ethers == sha256 : FAIL
viem   == sha256 : FAIL
```