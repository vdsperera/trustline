import hre from "hardhat";

async function main() {
  // 1. Read the borrower's address from the environment variable
  const borrowerAddress = process.env.BORROWER;
  
  if (!borrowerAddress) {
    console.error("❌ Please provide the borrower address via the BORROWER environment variable.");
    process.exit(1);
  }

  // Pool address (defaults to Base Sepolia testnet address if not provided)
  const poolAddress = process.env.POOL_ADDRESS || "0x18E93136f6cc76EbB8dEC0B552b958bab3851277";

  console.log(`Connecting to TrustlineLendingPool at ${poolAddress}...`);
  
  // Connect to the contract
  const TrustlineLendingPool = await hre.ethers.getContractFactory("TrustlineLendingPool");
  const pool = TrustlineLendingPool.attach(poolAddress);

  console.log(`Checking active loan for borrower: ${borrowerAddress}...`);
  
  // Read from the blockchain
  const loan = await pool.activeLoans(borrowerAddress);

  // Query token decimals from the lending pool's configured USDT token
  let decimals = 6;
  try {
    const usdtAddress = await pool.usdtToken();
    const tokenContract = await hre.ethers.getContractAt(["function decimals() view returns (uint8)"], usdtAddress);
    decimals = await tokenContract.decimals();
  } catch {
    decimals = 6;
  }

  if (loan.principal == 0n) {
    console.log("\n❌ No active loan found for this address on the blockchain.");
  } else {
    console.log("\n✅ Active Loan Found!");
    console.log(`Principal: ${hre.ethers.formatUnits(loan.principal, decimals)} USDT`);
    console.log(`Start Time: ${new Date(Number(loan.startTime) * 1000).toLocaleString()}`);
    console.log(`Interest Rate: ${loan.dailyInterestRate} basis points (2%)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
