import hre from "hardhat";

async function main() {
  const [owner, borrower] = await hre.ethers.getSigners();
  console.log(`Owner address: ${owner.address}`);
  console.log(`Borrower address: ${borrower.address}\n`);

  // 1. Deploy Mock USDT
  console.log("Deploying Mock USDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  console.log(`Mock USDT deployed to: ${usdt.target}`);

  // 2. Deploy TrustlineLendingPool
  console.log("Deploying TrustlineLendingPool...");
  const Pool = await hre.ethers.getContractFactory("TrustlineLendingPool");
  const pool = await Pool.deploy(owner.address, usdt.target);
  await pool.waitForDeployment();
  console.log(`TrustlineLendingPool deployed to: ${pool.target}\n`);

  // 3. Setup Initial Balances
  console.log("Minting USDT to owner and borrower...");
  await usdt.mint(owner.address, 100n * 10n**6n);
  await usdt.mint(borrower.address, 50n * 10n**6n);

  // 4. Owner Deposits 20 USDT
  const maxPoolSize = 20n * 10n**6n;
  console.log("Owner depositing 20 USDT into the pool...");
  await usdt.connect(owner).approve(pool.target, maxPoolSize);
  await pool.connect(owner).deposit(maxPoolSize);
  let availableLiquidity = await pool.availableLiquidity();
  console.log(`Pool available liquidity: ${hre.ethers.formatUnits(availableLiquidity, 6)} USDT\n`);

  // 5. Whitelist Borrower
  console.log("Whitelisting borrower...");
  await pool.connect(owner).addToWhitelist(borrower.address);
  
  // 6. Borrower Borrows 5 USDT
  const borrowAmount = 5n * 10n**6n;
  console.log("Borrower borrowing 5 USDT...");
  await pool.connect(borrower).borrow(borrowAmount);
  
  let borrowerBal = await usdt.balanceOf(borrower.address);
  availableLiquidity = await pool.availableLiquidity();
  console.log(`Borrower USDT balance: ${hre.ethers.formatUnits(borrowerBal, 6)} USDT`);
  console.log(`Pool available liquidity: ${hre.ethers.formatUnits(availableLiquidity, 6)} USDT\n`);

  // 7. Time Travel 10 Days
  console.log("Fast forwarding time by 10 days to accumulate interest...");
  const daysToFastForward = 10;
  await hre.network.provider.send("evm_increaseTime", [daysToFastForward * 86400]);
  await hre.network.provider.send("evm_mine");

  // 8. Borrower Repays Loan
  console.log("Borrower repaying loan...");
  // Approve a generous amount to cover principal + interest
  await usdt.connect(borrower).approve(pool.target, 10n * 10n**6n);
  
  const repayTx = await pool.connect(borrower).repay();
  const receipt = await repayTx.wait();
  
  // Find the Repaid event to see exactly how much was paid
  const repaidEvent = receipt.logs.find(
    log => log.fragment && log.fragment.name === 'Repaid'
  );
  const repaidAmount = repaidEvent.args.amount;
  
  console.log(`Borrower successfully repaid: ${hre.ethers.formatUnits(repaidAmount, 6)} USDT`);

  borrowerBal = await usdt.balanceOf(borrower.address);
  availableLiquidity = await pool.availableLiquidity();
  console.log(`Borrower final USDT balance: ${hre.ethers.formatUnits(borrowerBal, 6)} USDT`);
  console.log(`Pool final available liquidity: ${hre.ethers.formatUnits(availableLiquidity, 6)} USDT`);
  console.log("\nSimulation complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
