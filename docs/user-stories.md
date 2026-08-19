# User Stories

## US-001: Manage borrower whitelist
**ID:** US-001
**Title:** Manage borrower whitelist
**Statement:** As an Owner, I want to add and remove wallet addresses from the whitelist, so that I can control who is allowed to borrow from the lending pool.
**Priority:** Must have - essential to restrict access to the closed group of friends.
**Assumptions:** Owner has deployed the contract and has the owner role.
**Out of scope:** A UI for managing the whitelist. Automated KYC or identity verification.
**Acceptance criteria:**
```gherkin
Given the owner
When they add a valid wallet address to the whitelist
Then the address is recorded as whitelisted

Given the owner
When they remove a whitelisted address
Then the address is no longer whitelisted

Given the owner
When they add an address that is already whitelisted
Then the transaction reverts with an appropriate error

Given the owner
When they remove an address that is not on the whitelist
Then the transaction reverts with an appropriate error

Given the owner
When they remove an address that currently has an active loan
Then the address is removed from the whitelist
And the user retains the ability to repay the existing loan

Given a non-owner
When they attempt to add or remove an address from the whitelist
Then the transaction reverts with an authorization error
```

## US-002: Deposit USDT liquidity
**ID:** US-002
**Title:** Deposit USDT liquidity
**Statement:** As an Owner, I want to deposit USDT into the smart contract up to a maximum total pool size of 20 USDT, so that I can provide liquidity for borrowing.
**Priority:** Must have - essential for providing funds.
**Assumptions:** Contract is deployed. Owner has USDT in their wallet and has approved the contract to spend it.
**Out of scope:** Depositing tokens other than USDT.
**Acceptance criteria:**
```gherkin
Given the owner has approved USDT spending
When they deposit 10 USDT (and current pool size + 10 <= 20)
Then 10 USDT is transferred to the contract
And the available liquidity increases by 10

Given the owner has not approved USDT spending
When they deposit 10 USDT
Then the transaction reverts

Given the owner
When they attempt to deposit an amount that would make the total historical pool size exceed 20 USDT
Then the transaction reverts

Given the owner
When they deposit 0 USDT
Then the transaction reverts

Given a non-owner
When they attempt to deposit USDT
Then the transaction reverts
```

## US-003: Withdraw available liquidity
**ID:** US-003
**Title:** Withdraw available liquidity
**Statement:** As an Owner, I want to withdraw available USDT liquidity from the smart contract, so that I can retrieve my funds when they are not being borrowed.
**Priority:** Must have - essential for the owner to retrieve their funds.
**Assumptions:** The contract holds some available (unborrowed) USDT.
**Out of scope:** Withdrawing funds that are currently locked in active loans.
**Acceptance criteria:**
```gherkin
Given the contract has 10 USDT of available liquidity
When the owner withdraws 5 USDT
Then 5 USDT is transferred to the owner's wallet
And the available liquidity decreases by 5

Given the contract has 5 USDT of available liquidity and 15 USDT locked in loans
When the owner attempts to withdraw 10 USDT
Then the transaction reverts

Given the contract has 10 USDT of available liquidity
When the owner withdraws 10 USDT
Then 10 USDT is transferred to the owner's wallet
And the available liquidity becomes 0

Given a non-owner
When they attempt to withdraw liquidity
Then the transaction reverts
```

## US-004: Borrow USDT from the pool
**ID:** US-004
**Title:** Borrow USDT from the pool
**Statement:** As a Borrower, I want to borrow an amount of USDT up to the currently available pool liquidity, so that I can access short-term funds.
**Priority:** Must have - essential for the core flow.
**Assumptions:** The borrower is whitelisted. The borrower does not have an active loan. The pool has sufficient liquidity. The contract is not paused.
**Out of scope:** Borrowing an amount greater than the available liquidity. Borrowing multiple times simultaneously.
**Acceptance criteria:**
```gherkin
Given a whitelisted borrower with no active loan
And the pool has 15 USDT available
When they borrow 10 USDT
Then 10 USDT is transferred to the borrower
And an active loan of 10 USDT is recorded for them
And the available pool liquidity decreases by 10

Given a non-whitelisted user
When they attempt to borrow any amount
Then the transaction reverts

Given a whitelisted borrower with an active loan of 5 USDT
When they attempt to borrow another 5 USDT
Then the transaction reverts

Given a whitelisted borrower with no active loan
And the pool has 5 USDT available
When they attempt to borrow 10 USDT
Then the transaction reverts

Given a whitelisted borrower with no active loan
And the pool has 10 USDT available
When they borrow 10 USDT
Then the loan is successful
And the available pool liquidity becomes 0

Given a paused contract
When a whitelisted borrower attempts to borrow
Then the transaction reverts
```

## US-005: Configure interest rate
**ID:** US-005
**Title:** Configure interest rate
**Statement:** As an Owner, I want to configure the daily interest rate, so that I can adjust the return on the lending pool over time.
**Priority:** Should have - allows flexibility in the business model. Note: Addresses [NEEDS CLARIFICATION] in requirements.
**Assumptions:** Contract is deployed.
**Out of scope:** Applying the new interest rate retroactively to existing active loans.
**Acceptance criteria:**
```gherkin
Given the owner
When they update the interest rate to 3% daily
Then the new rate is recorded in the contract

Given the owner
When they update the interest rate to 0%
Then the new rate is recorded
And new loans will accrue 0 interest

Given a non-owner
When they attempt to change the interest rate
Then the transaction reverts
```

## US-006: Accrue pro-rata interest
**ID:** US-006
**Title:** Accrue pro-rata interest
**Statement:** As a Borrower, I want my loan to accrue simple interest pro-rata per second based on the rate at the time of borrowing, so that the interest charge is fair and precise based on the exact duration of my loan.
**Priority:** Must have - essential for the agreed mechanics. Note: Addresses [NEEDS CLARIFICATION] regarding existing loan rates.
**Assumptions:** The borrower has an active loan.
**Out of scope:** Compound interest. Interest rate changes affecting active loans.
**Acceptance criteria:**
```gherkin
Given a borrower with an active loan of 10 USDT at a 2% daily rate
When 24 hours (86400 seconds) pass
Then the accrued interest is exactly 0.2 USDT

Given a borrower with an active loan
When less than 1 second passes
Then the accrued interest is 0 (or negligible)

Given a borrower with an active loan of 10 USDT at a 2% daily rate
When the owner changes the global interest rate to 3% daily
And 24 hours pass
Then the accrued interest for this borrower is still calculated at the 2% rate (0.2 USDT)
```

## US-007: Repay loan and accrued interest
**ID:** US-007
**Title:** Repay loan and accrued interest
**Statement:** As a Borrower, I want to repay my loan principal plus accrued interest in a single transaction, so that I can clear my debt and become eligible to borrow again.
**Priority:** Must have - essential for the core flow.
**Assumptions:** The borrower has an active loan. The borrower has approved the contract to spend their USDT.
**Out of scope:** Partial repayments.
**Acceptance criteria:**
```gherkin
Given a borrower with a 10 USDT loan and 0.2 USDT accrued interest
And they have approved at least 10.2 USDT spending
When they repay their loan
Then exactly 10.2 USDT is transferred from them to the contract
And their active loan is cleared
And the available pool liquidity increases by 10.2 USDT

Given a borrower with an active loan who has been removed from the whitelist
When they repay their loan
Then the repayment is successful
And their debt is cleared

Given a borrower owing 10.2 USDT who has only approved 10.0 USDT spending
When they attempt to repay
Then the transaction reverts

Given a borrower owing 10.2 USDT who has approved spending but only has 10.0 USDT balance
When they attempt to repay
Then the transaction reverts

Given a borrower owing 10.2 USDT who has approved 20 USDT spending
When they repay
Then exactly 10.2 USDT is transferred
And the loan is cleared
```

## US-008: Emergency Pause
**ID:** US-008
**Title:** Pause borrowing
**Statement:** As an Owner, I want to trigger an emergency pause on the contract, so that I can prevent new borrows if an issue or vulnerability is identified.
**Priority:** Should have - important for security given it's dealing with real funds. Note: Addresses [NEEDS CLARIFICATION] in requirements.
**Assumptions:** None.
**Out of scope:** Pausing repayments or withdrawals.
**Acceptance criteria:**
```gherkin
Given the owner
When they trigger the emergency pause
Then the contract state is marked as paused

Given a paused contract
When the owner triggers unpause
Then the contract state is marked as unpaused

Given a paused contract
When the owner triggers pause again
Then the transaction reverts or has no effect

Given a paused contract and a borrower with an active loan
When the borrower attempts to repay
Then the repayment succeeds

Given a paused contract
When the owner attempts to withdraw available liquidity
Then the withdrawal succeeds

Given a non-owner
When they attempt to pause or unpause the contract
Then the transaction reverts
```
