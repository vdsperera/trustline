# Deployment Review — All Tasks

## Artifacts generated
- `.github/workflows/ci.yml`: Created a CI workflow to automatically run tests and compile the smart contracts on pushes and pull requests to `main`.
- `.env.example`: Previously created to outline required environment variables.

## Deployment prerequisites
Before deploying to production (e.g., Base L2), ensure the following prerequisites are met:
1. **RPC URL**: Obtain an RPC URL for the target network and set it in `.env` as `BASE_RPC_URL` (or equivalent).
2. **Private Key**: Obtain the deployment wallet's private key (must hold enough native gas tokens, e.g., ETH on Base) and set it in `.env` as `PRIVATE_KEY`.
3. **USDT Token Address**: Identify the official USDT token address on the target network.
4. **Hardhat Configuration**: Update `hardhat.config.js` to include the target network settings pointing to your `.env` variables.
5. **Update Deploy Script**: Update `scripts/deploy.js` to pass the official USDT address to the `TrustlineLendingPool` constructor instead of the mock USDT address.

## Deployment steps
Since smart contract deployments handle financial assets, automated continuous deployment (CD) directly from GitHub is not recommended for this MVP due to the risk of exposing the owner's private key in CI secrets.

Execute the following steps locally or on a secure deployment bastion:
1. Ensure `.env` is populated correctly.
2. Compile the contracts: `npx hardhat compile`
3. Run the deployment script against the target network: 
   ```bash
   npx hardhat run scripts/deploy.js --network base
   ```
4. Note the deployed contract address outputted to the console.
5. (Optional but recommended) Verify the contract source code on the network's block explorer (e.g., Basescan) using `npx hardhat verify`.

## Rollback plan
Smart contracts are immutable by design. If a critical flaw is discovered post-deployment:
1. **Emergency Pause**: The owner must immediately call the `pause()` function to halt all new borrows.
2. **Funds Recovery**: The owner calls `withdraw(availableLiquidity)` to secure unborrowed funds.
3. **Loan Run-off**: Allow existing borrowers to call `repay()` (which remains active during a pause). Once repaid, the owner withdraws those newly available funds.
4. **Redeployment**: Deploy a fixed version of the contract as a new instance. Whitelist users on the new instance and deposit the recovered liquidity.

## Findings

```
ID: DO-001
Severity: Minor
Category: Configuration
Location: scripts/deploy.js
Problem: The current deployment script creates and passes a `MockUSDT` address to the `TrustlineLendingPool` constructor.
Risk: If this script is run against production without modification, the pool will use a worthless mock token instead of real USDT.
Fix: Ensure that the deploy script is updated to accept the official USDT address from an environment variable before executing a production deployment.
```

## Verdict
Approved

The deployment artifacts are ready for the MVP stage. The CI pipeline will ensure code quality, and the manual deployment strategy is appropriate for a high-security smart contract release.
