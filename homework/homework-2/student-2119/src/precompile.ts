import { ethers } from "ethers";
import { getProvider } from "./utils";

const identity_precompile = "0x0000000000000000000000000000000000000004";

export async function callIdentityPrecompile(provider: ethers.JsonRpcProvider) {
    const result = await provider.call({
        to: identity_precompile,
        data: "0x12345678",
    });
    console.log("Identity precompile (0x04) eth_call return data:", result);
}

async function cli() {
    const provider = getProvider(false);
    await callIdentityPrecompile(provider);
}

if (require.main === module) {
    cli().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
