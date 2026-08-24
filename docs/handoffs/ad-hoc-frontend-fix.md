# Ad-Hoc Handoff: Frontend Interest Calculation & UI Fixes

## Context
During live testing on the Base Sepolia deployment, the frontend Borrower Dashboard failed to correctly identify and render active loans for whitelisted users.

## Issues Identified
1. **Invalid State Checking**: The frontend `App.jsx` was checking `if (loan.active)`, but the Solidity `Loan` struct does not contain a boolean `active` flag. Ethers.js returned the struct values (`principal`, `startTime`, `dailyInterestRate`), leaving `.active` as undefined.
2. **Missing View Function**: The frontend attempted to call `await poolContract.calculateInterest(address)`. However, the smart contract calculates interest dynamically inside the state-modifying `repay()` function and does not expose a read-only view function for the current accrued interest. This caused the frontend check to throw an error and halt rendering.

## Implementation Details
1. **State Check Fix**: Replaced `if (loan.active)` with `if (loan.principal > 0n)` to accurately determine if a user has an active loan.
2. **Frontend Interest Calculation**: 
   - Replicated the Solidity simple interest formula (`Principal * Rate * Time / 864000000`) directly inside `App.jsx`.
   - Used JavaScript's `Math.floor(Date.now() / 1000)` to simulate `block.timestamp`.
   - Applied this manual calculation to both the Borrower Dashboard display and the max approval amount in `handleRepay`.
3. **Repayment Buffer**: Added a 5-minute interest buffer to the USDT `approve()` transaction in the frontend. This prevents the repayment from failing due to slippage if the block is mined several seconds after the frontend calculates the exact debt.

## Architecture Impact
- **No Smart Contract Changes**: The `TrustlineLendingPool` contract was already deployed and verified. No immutable logic was modified. All fixes were applied purely at the client level.

## Verification
- Confirmed that the Borrower Dashboard now successfully renders active loans with real-time interest updates.
- Tested repayment approval margins.
