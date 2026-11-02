# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Configurable USDT/LKR Rate (Default 333.14)**: Added a customizable exchange rate setting in the Admin Dashboard (defaulting to 333.14 LKR/USDT based on actual P2P transaction rates), dynamically updating Sri Lankan Rupee equivalents across all wallet balances, pool liquidity, and active borrower debt.
- **Admin Active Loan Breakdown & LKR Equivalent**: Display comprehensive loan analytics in the Admin Directory for friends with active loans, including principal, accrued interest, total debt owed (with dynamic LKR conversion), and loan duration.
- **On-Chain Whitelist Discovery & Inline Alias Management**: Automatically scans historical `WhitelistUpdated` blockchain events on wallet connection to discover all previously whitelisted friends regardless of device or cleared cache. Added inline nickname editing (✏️) to label any discovered address.
- **Whitelisted Friends Directory & Access Control Management**: Added support for attaching friend aliases/nicknames to wallet addresses (stored locally for 0-gas overhead), a live directory of whitelisted borrowers with real-time on-chain active loan tracking, and single-click revocation via the smart contract's `removeFromWhitelist` function.
- **Premium Frontend UI**: Introduced a glassmorphism dark-mode UI for interacting with the Trustline Lending Pool.
- **Role-Based Dashboards**: Distinct dashboards for Pool Owners (Admin controls) and Borrowers.
- **Dynamic Deposit & Max Top-Up**: Added customizable deposit amount input and a "Max" button in the Admin Dashboard, allowing the owner to deposit any amount up to the pool's remaining headroom.
- **Deposit Validation & Capacity Helpers**: Added `calculateRemainingCapacity` and `validateDepositAmount` helper functions with unit test suite in `frontend/src/utils.test.js`.
- **Hardhat Check Script**: Added a CLI diagnostic script (`check-loan`) to query active loans directly from the blockchain via Hardhat Tasks.
- **Etherscan V2 Support**: Upgraded `hardhat.config.js` to support the new Etherscan/Basescan V2 API for contract verification.

### Fixed
- **Admin Whitelist Form & Grid Containment**: Redesigned the "Add Whitelisted Friend" form into a clean stacked layout with full-width friend name and wallet address inputs and a full-width submission button. Updated the CSS grid with `minmax(0, 1fr)` column tracks and child `min-width: 0` containment to eliminate input/button overflow on intermediate screen sizes, and added a responsive `@media (max-width: 820px)` collapse to a single-column layout.
- **Mobile UI & Input Group Layout Overflow**: Resolved button overflow on mobile viewports by adding `min-width: 0` to inputs, responsive wrapping for `.input-group` on viewports under 520px, and dedicated `.btn-max` responsive styling.
- **Friendly Custom Error Decoding**: Upgraded `parseError` in `frontend/src/utils.js` to decode EVM custom errors (e.g. `NotWhitelisted`, selector `0x584a7938` / ASCII `"XJy8"`, `InsufficientLiquidity`, `LoanAlreadyActive`) into plain English guidance instead of showing raw error codes.
- **Deposit Undefined Decimals Error**: Fixed a runtime `ReferenceError: decimals is not defined` in `handleDeposit` by dynamically querying the token contract's `decimals()` before converting deposit amounts with `ethers.parseUnits`.
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
