import hre from "hardhat";

async function main() {
  const usdtAddress = "0x4687Da226d4Dc2c65a2317303A6582fc3fED1517";
  const targetAddress = "0x0915b8F3857c33AD446A1b82Cb3E1498E352cbE3";
  // USDT has 6 decimals, so this mints 100 USDT
  const mintAmount = hre.ethers.parseUnits("100", 6); 

  console.log(`Minting 100 Mock USDT to ${targetAddress}...`);

  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = MockUSDT.attach(usdtAddress);

  // We are calling this using the deployment private key loaded in hardhat.config.js
  const tx = await usdt.mint(targetAddress, mintAmount);
  
  console.log(`Transaction sent! Hash: ${tx.hash}`);
  console.log("Waiting for block confirmation...");
  
  await tx.wait();

  console.log("Tokens minted successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
