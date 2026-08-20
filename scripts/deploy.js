import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // For local testing, we would deploy a mock USDT token first
  // But for now, we'll just use the deployer's address as a placeholder
  const mockUsdtAddress = deployer.address;

  const TrustlineLendingPool = await hre.ethers.getContractFactory("TrustlineLendingPool");
  const pool = await TrustlineLendingPool.deploy(deployer.address, mockUsdtAddress);

  await pool.waitForDeployment();

  console.log(`TrustlineLendingPool deployed to: ${pool.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
