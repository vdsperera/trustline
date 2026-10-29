---
name: contract-testing
description: Write and improve Hardhat/Chai tests for Trustline smart contracts and run the loan lifecycle simulation. Use when the user says "test the contract", "write tests", "add tests for", "check coverage", "simulate the loan", or after implementing or changing anything in contracts/. Use it even when the user only says "make sure it works" about contract code.
---

# Contract Testing

## Steps
1. Read the contract and existing tests in `test/` first. Do not duplicate existing cases.
2. Use `MockUSDT.sol` (6 decimals). Never use real token addresses.
3. Use Hardhat time helpers (`time.increase`, `loadFixture`) to test interest over time.
4. Run `npx hardhat test` and, if available, `npx hardhat coverage`. Report real results only.

## Required test categories
- **Happy path**: deposit, whitelist, borrow, wait, repay principal + interest, balances correct.
- **Interest accuracy**: expected interest at 1 minute, 1 hour, 1 day, 7 days, 30 days, computed independently in the test with BigInt, compared exactly (or within a documented 1-unit rounding tolerance).
- **Access control**: every owner-only function reverts for non-owners; non-whitelisted wallets cannot borrow.
- **Invariants**: one active loan per borrower; pool cap never exceeded; owner cannot drain borrowed funds.
- **Failure paths**: zero amount, zero address, borrow above liquidity, repay without allowance, repay with no loan, double repay.
- **Buffer behaviour**: confirm exactly what the borrower is charged and that no overcharge occurs.
- **Edge cases**: whitelist removal during an active loan; very long outstanding loan; borrowing again right after repaying.
- **Events**: assert expected events and arguments.

## Rules
- A failing test means investigate the contract, not weaken the test. If the contract is wrong, report it; do not silently change contract behaviour.
- Test names describe behaviour ("reverts when borrower already has an active loan").
- Write a short summary to `docs/test-reports/<date>.md`: tests added, results, coverage numbers, known gaps.
