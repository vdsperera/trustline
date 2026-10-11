# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Premium Frontend UI**: Introduced a glassmorphism dark-mode UI for interacting with the Trustline Lending Pool.
- **Role-Based Dashboards**: Distinct dashboards for Pool Owners (Admin controls) and Borrowers.
- **Dynamic Deposit & Max Top-Up**: Added customizable deposit amount input and a "Max" button in the Admin Dashboard, allowing the owner to deposit any amount up to the pool's remaining headroom.
- **Deposit Validation & Capacity Helpers**: Added `calculateRemainingCapacity` and `validateDepositAmount` helper functions with unit test suite in `frontend/src/utils.test.js`.
- **Hardhat Check Script**: Added a CLI diagnostic script (`check-loan`) to query active loans directly from the blockchain via Hardhat Tasks.
- **Etherscan V2 Support**: Upgraded `hardhat.config.js` to support the new Etherscan/Basescan V2 API for contract verification.

### Fixed
- **Admin Deposit Exceeds Max Pool Revert**: Fixed an issue where the frontend prevented the owner from topping up a partially filled pool by always attempting to deposit a hardcoded 20 USDT.
- **Frontend Active Loan Rendering**: Fixed a bug where the frontend failed to render active loans because it checked for a non-existent `loan.active` boolean instead of checking if `loan.principal > 0`.
- **Frontend Interest Calculation**: Replicated the smart contract's simple interest calculation logic in the frontend (`App.jsx`), as the smart contract did not expose a view function for it. Added a 5-minute buffer to USDT approvals to prevent repayment reverts.

## [1.0.0] - 2026-08-20

### Added
- **TrustlineLendingPool Contract**: The core smart contract managing the lending pool.
- **Whitelist Management**: Owner can add/remove borrowers to control access.
- **Dynamic Interest Rate**: 2% daily simple interest calculation pro-rated per second of the loan duration.
- **Liquidity Management**: Owner can deposit up to 20 USDT and withdraw unborrowed funds.
- **Borrowing & Repayment**: Whitelisted users can borrow up to available liquidity and repay their exact principal + interest in a single transaction.
- **Emergency Controls**: Owner can pause and unpause borrowing activities.
- **Comprehensive Testing**: Full test suite and interaction simulation scripts using Hardhat and Ethers.js.
