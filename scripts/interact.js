import hre from "hardhat";

async function main() {
  // Replace these with the actual deployed addresses from your testnet
  const MOCK_USDT_ADDRESS = "0x4687Da226d4Dc2c65a2317303A6582fc3fED1517";
  const POOL_ADDRESS = "0x18E93136f6cc76EbB8dEC0B552b958bab3851277";

  const [signer] = await hre.ethers.getSigners();
  console.log(`Interacting with account: ${signer.address}`);

  const usdt = await hre.ethers.getContractAt("MockUSDT", MOCK_USDT_ADDRESS);
  const pool = await hre.ethers.getContractAt("TrustlineLendingPool", POOL_ADDRESS);

  // 1. Approve the Pool to spend 20 USDT on your behalf
  const depositAmount = 20n * 10n ** 6n; // 20 USDT (6 decimals)
  
  console.log("Approving pool to spend USDT...");
  const approveTx = await usdt.approve(POOL_ADDRESS, depositAmount);
  await approveTx.wait();
  console.log("Approved successfully!");

  // 2. Deposit 20 USDT into the pool
  console.log("Depositing 20 USDT into the pool...");
  const depositTx = await pool.deposit(depositAmount);
  await depositTx.wait();
  console.log("Deposited successfully!");

  // 3. Check the pool's available liquidity
  const liquidity = await pool.availableLiquidity();
  const total = await pool.totalHistoricalPoolSize();
  console.log(`Pool Available Liquidity: ${hre.ethers.formatUnits(liquidity, 6)} USDT`);
  console.log(`Pool Total Historical: ${hre.ethers.formatUnits(total, 6)} USDT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
