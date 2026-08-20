import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Deploy MockUSDT for testnet usage
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  console.log(`Mock USDT deployed to: ${usdt.target}`);

  // Deploy TrustlineLendingPool using the MockUSDT address
  const TrustlineLendingPool = await hre.ethers.getContractFactory("TrustlineLendingPool");
  const pool = await TrustlineLendingPool.deploy(deployer.address, usdt.target);

  await pool.waitForDeployment();

  console.log(`TrustlineLendingPool deployed to: ${pool.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
