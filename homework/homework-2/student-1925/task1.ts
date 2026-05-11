import { ethers } from "ethers";
import { formatEther } from "viem";
import { h160ToSs58, ss58ToH160 } from "./address";
import { getEthersProvider, getPapiApi, getViemClient } from "./utils";

/**
 * Replace with an address that has testnet funds for meaningful output.
 * Using a common test address that should have Westend WND tokens
 */
const TEST_H160 = "0x5c434e203265949d679ec97b950dacf4e4d2e17e";
const EVM_DECIMALS = 18;
const SUBSTRATE_DECIMALS = 12;

function scaleSubstrateToEvmUnits(value: bigint): bigint {
  if (EVM_DECIMALS < SUBSTRATE_DECIMALS) {
    return value / 10n ** BigInt(SUBSTRATE_DECIMALS - EVM_DECIMALS);
  }
  return value * 10n ** BigInt(EVM_DECIMALS - SUBSTRATE_DECIMALS);
}

async function main() {
  console.log("=== Task1: Address convert + balance consistency ===");
  console.log("Network: Westend Asset Hub testnet");

  const ss58 = h160ToSs58(TEST_H160);
  const roundTripH160 = ss58ToH160(ss58);

  console.log("\n[Address conversion]");
  console.log("H160:", TEST_H160);
  console.log("SS58:", ss58);
  console.log("SS58 -> H160:", roundTripH160);
  console.log(
    "Round-trip check:",
    roundTripH160.toLowerCase() === ethers.getAddress(TEST_H160).toLowerCase() ? "PASS" : "FAIL",
  );

  const ethersProvider = getEthersProvider();
  const viemClient = getViemClient();
  const papi = await getPapiApi();

  console.log("\n[Balance query]");
  const ethersBal = await ethersProvider.getBalance(TEST_H160);
  const viemBal = await viemClient.getBalance({ address: TEST_H160 as `0x${string}` });
  const accountInfo = (await papi.query.system.account(ss58)) as any;

  const substrateFree = BigInt(accountInfo.data.free.toString());
  const substrateAsEvmUnit = scaleSubstrateToEvmUnits(substrateFree);

  console.log("ethers balance (wei):", ethersBal.toString());
  console.log("viem balance   (wei):", viemBal.toString());
  console.log("PAPI free   (planck):", substrateFree.toString());
  console.log("PAPI scaled  (wei*):", substrateAsEvmUnit.toString());

  const evmAgree = ethersBal === viemBal;
  const diff = ethersBal >= substrateAsEvmUnit ? ethersBal - substrateAsEvmUnit : substrateAsEvmUnit - ethersBal;
  const tolerance = 10n ** 16n; // 0.01 token tolerance in 18 decimals
  const substrateClose = diff <= tolerance;

  console.log("\n[Consistency check]");
  console.log("ethers vs viem:", evmAgree ? "PASS" : "FAIL");
  console.log("EVM vs PAPI (scaled, tolerance=0.01):", substrateClose ? "PASS" : "FAIL");
  console.log("difference (wei):", diff.toString());
  console.log("ethers formatted:", formatEther(ethersBal));
  await papi.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });