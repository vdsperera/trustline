# TrustlineLendingPool API

The `TrustlineLendingPool` smart contract acts as the central hub for the Trustline protocol. It manages user whitelists, deposits, withdrawals, borrows, and repayments using USDT.

## Contract Architecture
For higher-level architectural decisions and data models, please refer to the [Architecture Document](../architecture.md).

## State Variables

### `usdtToken`
```solidity
IERC20 public immutable usdtToken;
```
The reference to the underlying USDT token contract used for all transactions.

### `activeLoans`
```solidity
mapping(address => Loan) public activeLoans;
```
Maps user addresses to their active loan details. 

### `whitelist`
```solidity
mapping(address => bool) public whitelist;
```
Maps user addresses to their whitelist status. Only `true` addresses can borrow.

### `availableLiquidity`
```solidity
uint256 public availableLiquidity;
```
The current amount of unborrowed USDT available in the pool.

### `globalDailyInterestRate`
```solidity
uint256 public globalDailyInterestRate;
```
The current daily interest rate for new loans, represented in basis points (e.g., 200 = 2%).

### `totalHistoricalPoolSize`
```solidity
uint256 public totalHistoricalPoolSize;
```
The total historical sum of all deposits. 

### `MAX_POOL_SIZE`
```solidity
uint256 public constant MAX_POOL_SIZE = 20 * 10**6;
```
The hard cap on `totalHistoricalPoolSize` (20 USDT).

---

## Owner Functions (AccessController)

### `addToWhitelist(address user)`
Adds a user to the borrowing whitelist.
- **Modifiers**: `onlyOwner`
- **Emits**: `WhitelistUpdated(user, true)`

### `removeFromWhitelist(address user)`
Removes a user from the borrowing whitelist. Active loans are not affected, and users can still repay existing loans.
- **Modifiers**: `onlyOwner`
- **Emits**: `WhitelistUpdated(user, false)`

### `setInterestRate(uint256 dailyRate)`
Updates the global daily interest rate. This only affects loans taken *after* the update.
- **Modifiers**: `onlyOwner`
- **Emits**: `InterestRateUpdated(dailyRate)`

### `pause()` / `unpause()`
Triggers or lifts the emergency pause state. While paused, borrows are disabled, but repayments and withdrawals are still permitted.
- **Modifiers**: `onlyOwner`

---

## Liquidity Functions (Owner)

### `deposit(uint256 amount)`
Deposits USDT into the lending pool. The caller must have approved the contract to spend the `amount`.
- **Modifiers**: `onlyOwner`
- **Reverts**: `InvalidAmount` if 0, `ExceedsMaxPoolSize` if `totalHistoricalPoolSize + amount > 20 USDT`.
- **Emits**: `Deposited(msg.sender, amount)`

### `withdraw(uint256 amount)`
Withdraws unborrowed USDT from the lending pool back to the owner.
- **Modifiers**: `onlyOwner`
- **Reverts**: `InvalidAmount` if 0, `InsufficientAvailableLiquidity` if `amount > availableLiquidity`.
- **Emits**: `Withdrawn(msg.sender, amount)`

---

## Borrower Functions

### `borrow(uint256 amount)`
Borrows USDT from the pool.
- **Modifiers**: `whenNotPaused`
- **Reverts**: 
  - `InvalidAmount` if 0
  - `NotWhitelisted` if caller is not whitelisted
  - `LoanAlreadyActive` if caller already has a loan
  - `InsufficientLiquidity` if `amount > availableLiquidity`
- **Emits**: `Borrowed(msg.sender, amount, globalDailyInterestRate)`

### `repay()`
Repays an active loan in full, calculating exact pro-rata simple interest based on `block.timestamp`. The exact total amount required is pulled via `safeTransferFrom`.
- **Reverts**: 
  - `NoActiveLoan` if caller has no active loan
  - `InsufficientAllowance` if caller hasn't approved enough USDT to cover principal + interest
- **Emits**: `Repaid(msg.sender, totalRepayment)`
