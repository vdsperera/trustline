import hre from "hardhat";
import fs from "fs";
import path from "path";

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

  // Export to frontend
  const frontendPath = path.join(process.cwd(), "frontend", "src", "contracts.json");
  const contractsData = {
    usdtAddress: usdt.target,
    poolAddress: pool.target,
    usdtAbi: JSON.parse(usdt.interface.formatJson()),
    poolAbi: JSON.parse(pool.interface.formatJson())
  };

  fs.writeFileSync(frontendPath, JSON.stringify(contractsData, null, 2));
  console.log(`Contract data exported to ${frontendPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
