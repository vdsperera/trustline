# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-08-20

### Added
- **TrustlineLendingPool Contract**: The core smart contract managing the lending pool.
- **Whitelist Management**: Owner can add/remove borrowers to control access.
- **Dynamic Interest Rate**: 2% daily simple interest calculation pro-rated per second of the loan duration.
- **Liquidity Management**: Owner can deposit up to 20 USDT and withdraw unborrowed funds.
- **Borrowing & Repayment**: Whitelisted users can borrow up to available liquidity and repay their exact principal + interest in a single transaction.
- **Emergency Controls**: Owner can pause and unpause borrowing activities.
- **Comprehensive Testing**: Full test suite and interaction simulation scripts using Hardhat and Ethers.js.
