## Deploy
```bash
maoqinsun@maoqindeMacBook-Air student-1924 % npx hardhat ignition deploy ignition/modules/StorageModule.ts --network polkadotHubTestnet
◇ injected env (1) from .env // tip: ⌘ override existing { override: true }
✔ Confirm deploy to network polkadotHubTestnet (420420417)? … yes
Hardhat Ignition 🚀

Deploying [ StorageModule ]

Batch #1
  Executed StorageModule#Storage

[ StorageModule ] successfully deployed 🚀

Deployed Addresses

StorageModule#Storage - 0x9021bcBD064EFdCD09B47dbfAe1c2BA4A74B4764
```


## Interact
```bash
maoqinsun@maoqindeMacBook-Air student-1924 % npx hardhat run scripts/interact.ts --network polkadotHubTestnet
◇ injected env (1) from .env // tip: ⌘ enable debugging { debug: true }
◇ injected env (0) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
NetworkNotFoundError: No network with chain id 420420417 found. You can override the chain by passing it as a parameter to the client getter:

import { someChain } from "viem/chains";
const client = await hre.viem.getPublicClient({
  chain: someChain,
  ...
});

You can find a list of supported networks here: https://github.com/wevm/viem/blob/main/src/chains/index.ts
    at getChain (/Volumes/Project/Polkadot/2026-h2-polkadot/homework/homework-4/student-1924/node_modules/@nomicfoundation/hardhat-viem/src/internal/chains.ts:42:13)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async getWalletClients (/Volumes/Project/Polkadot/2026-h2-polkadot/homework/homework-4/student-1924/node_modules/@nomicfoundation/hardhat-viem/src/internal/clients.ts:88:47)
    at async main (/Volumes/Project/Polkadot/2026-h2-polkadot/homework/homework-4/student-1924/scripts/interact.ts:6:19)
```