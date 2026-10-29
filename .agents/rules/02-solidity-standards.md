# Solidity Standards (apply to files in contracts/)

## Language and libraries
- Pin the compiler version in the pragma (no floating `^`) and match `hardhat.config.js`.
- Use audited OpenZeppelin contracts instead of hand-rolled versions: `Ownable`/`AccessControl`, `ReentrancyGuard`, `SafeERC20`, `Pausable` when justified.
- Always use `SafeERC20` for token transfers. USDT-style tokens may not return a boolean.

## Money and math
- Token amounts are integers in the token's smallest unit. USDT uses 6 decimals. Never assume 18.
- Multiply before dividing. State the rounding direction in a comment. Rounding must never favour the borrower in a way that lets the pool lose funds, and must never let the pool charge more than the documented rate.
- Interest uses `block.timestamp`. Never use `tx.origin` for auth.
- Check casts between integer sizes even with Solidity >=0.8.

## Structure
- Checks-Effects-Interactions: validate, update state, then do external calls last.
- Use `nonReentrant` on every function that moves tokens.
- Custom errors instead of revert strings. Emit an event for every state change that matters (deposit, borrow, repay, whitelist change, cap change, owner action).
- Every external/public function has NatSpec describing who can call it, what it changes, and what it reverts on.
- Validate all inputs: non-zero address, non-zero amount, amount within cap/limits.
- Owner powers must be minimal and documented. List them in a comment block at the top of the contract. No function may let the owner move borrowed or user funds arbitrarily.
- No unbounded loops over user-controlled arrays.

## Edge cases to always consider
- Whitelist removal while a loan is active.
- Repayment when interest has grown larger than expected, or the pool balance changed.
- Zero-second loans and very long loans.
- Approvals: borrower must approve enough for principal + interest + buffer.
- Pool cap reached or exceeded by a deposit.
