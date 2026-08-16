# Issues List

ID: REQ-001
Type: Gap
Location: "Whitelist Management: Owner can add/remove approved friend wallet addresses."
Problem: It is not specified what happens if a user with an active loan is removed from the whitelist.
Question: Can a removed user still repay their existing loan, even if they can't borrow again?
Suggested fix: "Owner can add/remove approved friend wallet addresses. If a user is removed while having an active loan, they are still permitted to repay it, but cannot initiate new borrows."

ID: REQ-002
Type: Ambiguity
Location: "Owner can deposit (up to max 20 USDT) and withdraw funds."
Problem: It is unclear if the owner can withdraw funds while loans are active, and if the "max 20 USDT" is a hard cap on the contract balance or just a deposit limit.
Question: Can the owner only withdraw the currently available (unborrowed) liquidity? Is 20 USDT the absolute maximum the contract will ever hold (excluding interest)?
Suggested fix: "Owner can deposit funds up to a maximum total pool size of 20 USDT. Owner can withdraw available liquidity at any time, but cannot withdraw funds currently locked in active loans until they are repaid."

ID: REQ-003
Type: Gap
Location: "Whitelisted users can borrow USDT if they don't have an active loan and the pool has sufficient funds."
Problem: The borrow amount per user is not specified. Can one user borrow the entire 20 USDT pool, or is there a limit per loan?
Question: Is there a maximum borrow amount per user per loan?
Suggested fix: "Whitelisted users can borrow any amount up to the currently available pool liquidity (max 20 USDT), provided they do not already have an active loan."

ID: REQ-004
Type: Ambiguity
Location: "Time-based Interest Calculation: Accrues 2% daily interest (configurable by owner)."
Problem: "2% daily" does not specify whether it is simple or compound interest, nor the granularity of time calculation. It also doesn't specify if changing the rate affects existing loans.
Question: Is the interest simple or compound? Should the interest rate change affect active loans, or only new ones?
Suggested fix: "Interest is simple interest (not compounded), calculated pro-rata per second based on a 2% daily rate. If the owner configures a new interest rate, it only applies to new borrows; existing loans keep the rate they had at the time of borrowing."

ID: REQ-005
Type: Gap
Location: "Borrowers must repay the full principal + accrued interest in a single transaction to clear their debt and borrow again."
Problem: It doesn't specify how the contract handles a user sending more USDT than required to clear the debt.
Question: Should the contract refund excess USDT, or require the exact amount?
Suggested fix: "Borrowers must repay the exact amount (principal + accrued interest) to clear their debt. If they send more, the contract will refund the excess amount to the borrower."

---

# Refined Requirements Document

## Core Actors
- **Owner**: The deployer of the contract. Manages the whitelist, funds the pool, and configures parameters.
- **Borrower**: A whitelisted wallet address that can borrow and repay funds.

## Smart Contract Requirements

### 1. Whitelist Management
- `[REFINED]` Owner can add/remove approved friend wallet addresses. If a user is removed while having an active loan, they are still permitted to repay it, but cannot initiate new borrows.

### 2. Lending Pool Management
- `[REFINED]` Owner can deposit USDT into the contract up to a maximum total pool size of 20 USDT.
- `[REFINED]` Owner can withdraw available liquidity at any time, but cannot withdraw funds currently locked in active loans until they are repaid.

### 3. Borrowing
- `[REFINED]` Whitelisted users can borrow any amount up to the currently available pool liquidity (max 20 USDT), provided they do not already have an active loan.
- `[REFINED]` A user can only have one active loan at a time.

### 4. Interest Calculation
- `[REFINED]` Interest is simple interest (not compounded), calculated pro-rata per second based on a 2% daily rate.
- `[REFINED]` The daily interest rate is configurable by the owner.
- `[NEEDS CLARIFICATION]` If the owner configures a new interest rate, it only applies to new borrows; existing loans keep the rate they had at the time of borrowing. (Assuming this for simplicity).

### 5. Repayment
- `[REFINED]` Borrowers must repay the exact full amount (principal + accrued interest) in a single transaction to clear their debt and borrow again.
- `[REFINED]` If they authorize and send more than the required amount, the contract will only transfer the exact required amount (since it's ERC20 `transferFrom`).

### 6. Emergency / Administration
- `[NEEDS CLARIFICATION]` Contract should have an emergency pause feature that prevents new borrows, in case of identified issues. (Assumed for security).
- `[NEEDS CLARIFICATION]` No specific frontend is required; interaction via block explorer is acceptable for MVP.
