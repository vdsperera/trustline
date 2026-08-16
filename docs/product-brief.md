# Product Brief — Friend Lending Smart Contract (Trustline)

## Problem
The user currently lends small amounts of money to friends via manual bank transfers. Tracking who owes what, calculating interest, and managing repayments manually is tedious, error-prone, and socially awkward to enforce.

## Target Users
- Primary: The user (as the lender/liquidity provider).
- Secondary: A pre-decided, closed group of friends (borrowers).
- Not for: The general public, anonymous borrowers, or large-scale lending.

## Value Proposition
For a closed group of friends who occasionally need short-term liquidity, this smart contract is an automated lending pool that handles borrowing, interest calculation, and repayment tracking seamlessly. Unlike manual bank transfers and spreadsheets, it provides transparent, trustless accounting and automatically prevents users from taking new loans until previous ones are cleared.

## Business Model
- Revenue model: Interest earned on the loans (default 2% per day, configurable).
- Pricing direction: The "cost" is the gas fee to interact with the contract + the accrued interest.
- Free vs paid: N/A. It's a closed pool using real funds.

## MVP Scope
### Core hypothesis
Automating small, short-term loans through a smart contract will eliminate manual tracking overhead and ensure clear boundaries for borrowing among friends.

### In MVP (launch features)
1. **Whitelist Management**: Owner can add/remove approved friend wallet addresses. Essential to restrict access.
2. **Lending Pool Management**: Owner can deposit (up to max 20 USDT) and withdraw funds. Essential for providing liquidity.
3. **Borrow Function**: Whitelisted users can borrow USDT if they don't have an active loan and the pool has sufficient funds. Essential for the core flow.
4. **Time-based Interest Calculation**: Accrues 2% daily interest (configurable by owner). Essential for the agreed mechanics.
5. **Repay Function**: Borrowers must repay the full principal + accrued interest in a single transaction to clear their debt and borrow again. Essential for the core flow.

### NOT in MVP (deferred)
1. **Partial Repayments**: Simplifies the accounting logic for MVP to require full repayment.
2. **Multi-token Support**: Sticking to USDT only for MVP.
3. **Dedicated Frontend**: Initially, interaction can happen via a block explorer (e.g., Arbiscan/Polygonscan) or a minimal script to save time.
4. **Collateralization**: This is an uncollateralized loan based on real-world trust among friends.

### Success metric
The contract successfully processes at least one full cycle of deposit -> borrow -> interest accrual -> repay -> withdraw without manual intervention or accounting errors.

## Risks & Assumptions
| # | Risk | Assumption | Impact if wrong | Validation approach |
|---|------|-----------|----------------|-------------------|
| 1 | **Technical (Gas Fees)** | Friends will be willing to pay gas fees for transactions. | If deployed on Ethereum mainnet, gas fees will dwarf the 20 USDT loan limit, making it unusable. | Must deploy on a low-cost network (e.g., Polygon, Arbitrum, Base, BSC). |
| 2 | **Security** | The smart contract logic is flawless. | A bug in the interest calculation or access control could lock the 20 USDT or allow draining. | Keep logic extremely simple. Include an emergency pause/withdraw function for the owner. |
| 3 | **Enforcement** | Friends will actually repay. | Smart contracts cannot force repayment of uncollateralized loans. The only penalty is being blocked from future borrowing. | Rely on the existing real-world social trust. |
| 4 | **Regulatory** | Small-scale friend loans don't trigger severe regulatory scrutiny. | Unlikely to be an issue at 20 USDT, but technically acting as an unlicensed lender could have implications in some jurisdictions. | Keep it strictly private and small-scale. |

## Recommendation
**Go with caveats**

The core hypothesis is sound and technically feasible. The main caveat is that **you must deploy this on a low-fee Layer 2 network (like Base, Polygon, or Arbitrum)**, otherwise, the transaction fees will be higher than the actual loan amounts (20 USDT max pool). Additionally, the lack of collateral means you are still relying on real-world trust for repayment, but the automated accounting solves your primary pain point.
