/**
 * Get the revert reason from a failed transaction using Alchemy (or any RPC that
 * supports debug_traceTransaction). When Etherscan only shows "Fail", this can
 * show the exact require() message.
 *
 * Requires: SEPOLIA_RPC_URL (Alchemy recommended), TX_HASH in .env or as env var.
 *
 * Usage:
 *   TX_HASH=0x... npx hardhat run scripts/trace-failed-tx.ts --network sepolia
 *   # or set TX_HASH in .env
 */
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const txHash = process.env.TX_HASH;
  if (!txHash || !txHash.startsWith("0x")) {
    throw new Error("Set TX_HASH to the failed transaction hash (e.g. TX_HASH=0x123... npx hardhat run scripts/trace-failed-tx.ts --network sepolia)");
  }

  const hre = await import("hardhat");
  const { ethers } = hre as any;
  const provider = ethers.provider;

  console.log("Fetching trace for tx:", txHash);

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error("Transaction not found. Check the hash and that you are on the correct network (Sepolia).");
  }
  if (receipt.status === 1) {
    console.log("Transaction succeeded (status 1). No revert.");
    return;
  }

  try {
    const trace = await (provider as any).send("debug_traceTransaction", [
      txHash,
      { tracer: "callTracer", tracerConfig: { onlyTopCall: false } },
    ]);
    const out = JSON.stringify(trace, null, 2);
    console.log("Trace (callTracer):");
    console.log(out);
    const err = (trace as any)?.error ?? (trace as any)?.revertReason;
    if (err) console.log("\nRevert / error:", err);
  } catch (e: any) {
    if (e.message?.includes("debug_traceTransaction") || e.message?.includes("not supported")) {
      console.error("Your RPC does not support debug_traceTransaction. Use Alchemy (or similar) and set SEPOLIA_RPC_URL in .env.");
    }
    throw e;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
