# Code Review Report — TASK-004 to 007

## Findings

```
ID: CR-001
Severity: Blocker
Category: Correctness
Location: contracts/TrustlineLendingPool.sol, line 50, deposit()
Problem: The `deposit()` function does not check if the deposit amount is zero. User Story US-002 explicitly states: "Given the owner When they deposit 0 USDT Then the transaction reverts".
Risk: The acceptance criteria for the user story are not fully met. Allowing zero-value deposits clutters event logs and wastes gas without adding liquidity.
Fix: Add `if (amount == 0) revert("Invalid amount");` or define a custom error `error InvalidAmount();` and revert if `amount == 0` in `deposit()`.
```

```
ID: CR-002
Severity: Major
Category: Input validation
Location: contracts/TrustlineLendingPool.sol, line 62 and 72, withdraw() and borrow()
Problem: Similar to deposit, `withdraw()` and `borrow()` do not validate if the requested amount is greater than zero.
Risk: Users or the owner could execute zero-value transactions, which may trigger events and update state without any actual asset movement, potentially causing confusion in off-chain indexers.
Fix: Add a check to ensure `amount > 0` and revert with `InvalidAmount()` if it is not.
```

```
ID: CR-003
Severity: Major
Category: Test quality
Location: test/TrustlineLendingPool.test.js
Problem: The test suite lacks assertions for the zero-amount edge cases on `deposit`, `withdraw`, and `borrow` defined in the Gherkin scenarios.
Risk: Regressions related to zero-value transactions could go unnoticed.
Fix: Add test cases to verify that `deposit(0)`, `withdraw(0)`, and `borrow(0)` correctly revert.
```

```
ID: CR-004
Severity: Praise
Category: Security
Location: contracts/TrustlineLendingPool.sol
Problem: Excellent use of the Checks-Effects-Interactions pattern across all functions and the correct implementation of OpenZeppelin's `SafeERC20` to mitigate non-standard ERC20 token risks.
Risk: None.
Fix: Continue applying this pattern.
```

## Verdict

**Verdict:** Rework

Please fix the blockers and major issues identified above, specifically the input validation for zero amounts and their corresponding tests, and then request another review.
