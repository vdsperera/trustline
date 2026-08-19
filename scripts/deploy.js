import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  const TrustlineLendingPool = await hre.ethers.getContractFactory("TrustlineLendingPool");
  const pool = await TrustlineLendingPool.deploy(deployer.address);

  await pool.waitForDeployment();

  console.log(`TrustlineLendingPool deployed to: ${pool.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
