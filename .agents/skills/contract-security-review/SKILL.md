---
name: contract-security-review
description: Security review of Solidity smart contracts for the Trustline lending pool. Use this whenever the user says "review the contract", "security review", "audit this", "is this safe", "check TrustlineLendingPool", or after any change to files in contracts/. Also use before any testnet or mainnet deployment, even if the user does not explicitly ask for a security review.
---

# Contract Security Review

You are reviewing a small uncollateralized USDT lending pool. Be a skeptical reviewer, not a cheerleader. This is a structured self-review and does NOT replace a human audit; say so in the report.

## Steps
1. Read `contracts/` fully, plus `test/` and `docs/` for stated intent. Do not review from memory or from the README alone.
2. If tools are available, run them and record real output: `npx hardhat compile`, `npx hardhat test`, and `slither .` if installed. If a tool is unavailable, say "not run" rather than guessing.
3. Walk the checklist below. For each item write Pass / Fail / Not applicable / Could not verify, with file and line.

## Checklist
- **Access control**: who can call each function; owner powers; can the owner take borrowed or user funds? Is ownership transfer safe?
- **Reentrancy**: `nonReentrant` on token-moving functions; effects before interactions.
- **Token handling**: SafeERC20; 6-decimal assumptions; fee-on-transfer or non-standard return behaviour; correct allowance handling.
- **Interest math**: formula matches the documented 2% daily simple rate; multiply-before-divide; rounding direction; very short and very long loans; overflow in casts.
- **Repayment buffer**: is the 5-minute buffer charged or only required as allowance? Can a borrower be overcharged? Is any excess refunded?
- **Loan lifecycle**: one active loan per borrower enforced; state fully cleared on repay; no double-borrow or double-repay.
- **Whitelist**: removal while a loan is active; events; zero address.
- **Pool cap and liquidity**: cap enforced on deposits; borrow cannot exceed available liquidity; withdraw cannot exceed free liquidity.
- **Default risk**: no on-chain enforcement exists for non-payment (uncollateralized). Document what the owner can and cannot do, and note interest accrues without bound.
- **Events and visibility**: events for every state change; sensible function visibility.
- **Denial of service**: unbounded loops, dust griefing, owner key loss.

## Output
Write the report to `docs/reviews/security-<date>.md` with:
1. Scope (files and commit reviewed)
2. Tools run and results (or "not run")
3. Findings, each with severity (Critical/High/Medium/Low/Info), location, explanation, suggested fix
4. Checklist table
5. What this review did NOT cover (always include: formal verification, professional audit, economic/social risk)
6. Verdict: "No blocking findings found" or "Blocking findings" — never "safe" or "audited"

Never modify contract code during a review unless the user asks for fixes afterwards.
