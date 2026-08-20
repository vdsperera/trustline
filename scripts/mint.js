import hre from "hardhat";

async function main() {
  // Replace these with the actual deployed address from your testnet
  const MOCK_USDT_ADDRESS = "0x4687Da226d4Dc2c65a2317303A6582fc3fED1517"; 
  
  const [deployer] = await hre.ethers.getSigners();
  const addressToMintTo = deployer.address; // You can change this to your friend's wallet address
  
  // amount to mint (e.g. 100 USDT). Note that USDT has 6 decimals.
  const mintAmount = 100n * 10n**6n; 

  console.log(`Minting 100 USDT to ${addressToMintTo}...`);

  const usdt = await hre.ethers.getContractAt("MockUSDT", MOCK_USDT_ADDRESS);
  
  const tx = await usdt.mint(addressToMintTo, mintAmount);
  await tx.wait();

  console.log(`Successfully minted!`);
  
  const newBalance = await usdt.balanceOf(addressToMintTo);
  console.log(`New balance for ${addressToMintTo}: ${hre.ethers.formatUnits(newBalance, 6)} USDT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
