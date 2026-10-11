# Ad-Hoc Handoff: Dynamic Deposit Amount & Capacity Validation

## Context
In the original frontend implementation, the Admin Dashboard had a hardcoded deposit button that always attempted to deposit exactly `20` USDT. If the lending pool already held partial deposits (e.g., 12 USDT), attempting to deposit resulted in a contract revert (`ExceedsMaxPoolSize`) because the contract enforces a hard cap of 20 USDT on cumulative historical deposits.

## Issues Identified
1. **Hardcoded Deposit Amount**: `handleDeposit` in `App.jsx` hardcoded `ethers.parseUnits("20", decimals)`, preventing the admin from filling partial pool gaps.
2. **Missing Capacity Tracking**: The frontend did not query `totalHistoricalPoolSize` or `MAX_POOL_SIZE` from the smart contract to determine remaining available deposit headroom.
3. **No Input Field or Max Button**: The Admin Dashboard lacked an amount input field and a one-click "Max" fill option for the pool owner.

## Implementation Details
1. **Capacity & Validation Helpers (`frontend/src/utils.js`)**:
   - `calculateRemainingCapacity(maxPool, totalHistorical)`: Handles both `BigInt` (from contract view calls) and `Number` inputs. Determines headroom `maxPool - totalHistorical` and clamps negative results to 0.
   - `validateDepositAmount(amount, remainingCapacity)`: Validates that inputs are non-empty, strictly positive numbers, and within remaining capacity.
2. **Frontend State & Contract Queries (`frontend/src/App.jsx`)**:
   - Added `depositAmount` and `remainingDepositCapacity` state hooks.
   - In `refreshData`, queries `_pool.MAX_POOL_SIZE()` and `_pool.totalHistoricalPoolSize()` to update remaining deposit headroom.
   - Updated `handleDeposit` to validate the entered amount and approve/deposit the specified amount.
3. **Interactive UI (`frontend/src/App.jsx` & `frontend/src/index.css`)**:
   - Replaced static button with a number input (`step="0.1"`, `min="0.1"`).
   - Added a "Max" button styled with `.btn-secondary` to auto-fill the remaining capacity.
   - Added reactive button disabling and status helper text indicating remaining capacity (or indicating when pool is at capacity).
4. **Unit Test Coverage (`frontend/src/utils.test.js`)**:
   - Added test cases covering empty, partial, full, and overfilled pool scenarios with both `BigInt` and numbers.
   - Added validation tests for valid amounts, exact max capacity, exceeding capacity, zero/negative values, and non-numeric strings.

## Verification
- Unit test suite passed (`12/12` passing in `frontend/src/utils.test.js`).
- Production build succeeded (`npm run build` completed in ~560ms).
