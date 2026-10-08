import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  let usdtAddress;

  if (hre.network.name === "base") {
    // Mainnet deployment: Use the real USDT address from environment
    usdtAddress = process.env.USDT_ADDRESS;
    if (!usdtAddress || usdtAddress === "0x..." || usdtAddress === "") {
      throw new Error("Missing USDT_ADDRESS in environment for mainnet deployment");
    }
    console.log(`Using real USDT at: ${usdtAddress}`);
  } else {
    // Testnet / Local deployment: Deploy MockUSDT
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    usdtAddress = usdt.target;
    console.log(`Mock USDT deployed to: ${usdtAddress}`);
  }

  // Deploy TrustlineLendingPool using the determined USDT address
  const TrustlineLendingPool = await hre.ethers.getContractFactory("TrustlineLendingPool");
  const pool = await TrustlineLendingPool.deploy(deployer.address, usdtAddress);

  await pool.waitForDeployment();

  console.log(`TrustlineLendingPool deployed to: ${pool.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
