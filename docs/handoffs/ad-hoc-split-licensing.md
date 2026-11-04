# Ad-Hoc Handoff: Split Licensing Architecture (BUSL-1.1 & Proprietary)

## Context
As Trustline plans future expansion into a multi-pool, cross-chain, or expanded commercial DeFi lending protocol on Base, establishing clear licensing is critical to:
1. Prevent unauthorized commercial copycat/vampire forks during initial growth.
2. Enable public contract inspection, audits, and block explorer verification on Basescan.
3. Protect proprietary UI, branding, and frontend intellectual property.

## Licensing Architecture
We adopted a **Split Licensing** model:

| Component | Target Directory | License | Details |
| :--- | :--- | :--- | :--- |
| **Smart Contracts & Core Protocol** | `contracts/`, root | **BUSL-1.1** (Business Source License 1.1) | Non-production, testing, and testnet use permitted. Commercial mainnet forks restricted until Change Date. Converts to **GPL-3.0-or-later** on **November 4, 2029** (3-year protection). |
| **Frontend dApp & UI** | `frontend/` | **Proprietary** (All Rights Reserved) | Protects UI design, frontend application, styling, and branding assets against unauthorized cloning. |

## Implementation Details

1. **Root License (`LICENSE`)**:
   - Added standard `BUSL-1.1` parameters:
     - **Licensor**: `Trustline Protocol`
     - **Licensed Work**: Trustline lending protocol smart contracts and codebase.
     - **Additional Use Grant**: Permits execution and testing on public/private testnets (e.g., Base Sepolia, local nodes).
     - **Change Date**: `2029-11-04`
     - **Change License**: `GPL-3.0-or-later`
   - Added standard BUSL-1.1 terms and MariaDB attribution.

2. **Frontend License (`frontend/LICENSE`)**:
   - Added formal All Rights Reserved proprietary notice restricting reproduction, modification, or commercial redeployment.

3. **Smart Contract SPDX Identifier (`contracts/TrustlineLendingPool.sol`)**:
   - Changed `// SPDX-License-Identifier: MIT` to `// SPDX-License-Identifier: BUSL-1.1` to align with the repository license for verification on Basescan.

4. **Package Manifests (`package.json`, `frontend/package.json`)**:
   - Set `"license": "BUSL-1.1"` in root `package.json`.
   - Set `"license": "UNLICENSED"` in `frontend/package.json`.

## Verification
- **Smart Contract Compilation**: `npx hardhat compile` passed with zero errors (`Compiled 1 Solidity file successfully (evm target: paris)`).
- **Hardhat Test Suite**: `npx hardhat test` passed all **24 test cases** with zero regressions.
