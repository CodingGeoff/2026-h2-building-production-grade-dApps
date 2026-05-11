import type { Abi, Address, Hex } from "viem";

type DeployReceipt = {
  blockNumber: bigint;
  contractAddress: Address | null | undefined;
};

type WalletClientLike = {
  deployContract: (request: {
    abi: Abi;
    args?: readonly unknown[];
    bytecode: Hex;
    gasPrice?: undefined;
  }) => Promise<Hex>;
};

type PublicClientLike = {
  waitForTransactionReceipt: (request: { hash: Hex }) => Promise<DeployReceipt>;
};

export async function deployContractAndWait<TContract>({
  abi,
  bytecode,
  contractName,
  constructorArgs = [],
  getContractAt,
  publicClient,
  walletClient,
}: {
  abi: Abi;
  bytecode: Hex;
  contractName: string;
  constructorArgs?: readonly unknown[];
  getContractAt: (name: string, address: Address) => Promise<TContract>;
  publicClient: PublicClientLike;
  walletClient: WalletClientLike;
}): Promise<{
  contract: TContract;
  hash: Hex;
  receipt: DeployReceipt;
}> {
  const hash = await walletClient.deployContract({
    abi,
    args: constructorArgs,
    bytecode,
    gasPrice: undefined,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const { contractAddress } = receipt;

  if (contractAddress === null || contractAddress === undefined) {
    throw new Error(
      `Deployment receipt did not include a contract address for ${contractName}.`,
    );
  }

  const contract = await getContractAt(contractName, contractAddress);

  return { contract, hash, receipt };
}
