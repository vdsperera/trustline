---
name: mainnet-gate
description: Run the pre-flight readiness checklist before any mainnet deployment or mainnet configuration change. Triggers on phrases like "run mainnet gate", "/mainnet-gate", "check mainnet readiness", or "can we deploy to mainnet". Verifies tests, simulation, security reviews, Base USDT address verification, and deployment safety invariants without deploying.
---

# Mainnet Deployment Gate (/mainnet-gate)

Run this checklist before ANY mainnet deployment or mainnet config change. Do not deploy. This workflow only reports readiness; the owner deploys manually.

## Checklist Steps

1. Run `npx hardhat compile` and `npx hardhat test`. Record the real results.
2. Run `npx hardhat run scripts/simulate.js` and confirm the full loan lifecycle completes.
3. Run the `contract-security-review` skill and show any Critical/High findings. If any exist, stop: NOT READY.
4. Confirm the contract has not changed since the last testnet deployment. If it changed, require a fresh testnet run.
5. Real USDT address for Base: tell the owner to verify it themselves from official Tether/Base sources and Basescan. Do not guess or recall an address from memory.
6. Confirm configuration: pool cap, interest rate, whitelist contents, owner address (a wallet the owner controls and has backed up).
7. Check `.env.example` and the repo for leaked secrets, without printing any secret values.
8. Confirm the plan to verify the contract on Basescan after deployment.
9. Confirm the owner has decided, in writing, a policy for unpaid loans and has told all borrowers the interest rate.

## Output
Write `docs/deploy/mainnet-gate-<date>.md` with each step marked Pass / Fail / Could not verify, then a final line: `READY FOR OWNER REVIEW` or `NOT READY`. Never say "safe to deploy".
