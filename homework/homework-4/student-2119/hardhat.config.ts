import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const RPC_URL =
  process.env.RPC_URL ?? "https://services.polkadothub-rpc.com/testnet";

const polkaAccounts =
  PRIVATE_KEY !== "" ? ([PRIVATE_KEY] as readonly `0x${string}`[]) : [];

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
    },
  },
  networks: {
    polka: {
      type: "http",
      url: RPC_URL,
      accounts: polkaAccounts,
      chainId: 420420417,
    },
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
  },
});
