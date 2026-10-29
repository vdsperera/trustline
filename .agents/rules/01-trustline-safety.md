# Trustline: Safety Rules (always on)

Trustline is a USDT lending pool on Base. Contracts hold real money on mainnet. Treat every change as financially sensitive.

## Hard limits — never do these without explicit, written approval from the owner in this conversation
- Never deploy to Base Mainnet, or run any script with `--network base` / mainnet config.
- Never read, print, log, copy, or commit `.env`, private keys, mnemonics, or RPC keys. Only `.env.example` may be edited, and only with placeholder values.
- Never add code that signs transactions on behalf of the owner or stores keys anywhere (repo, frontend, CI logs).
- Never change these invariants silently. If a task requires changing one, stop and ask first:
  1. Pool cap (currently 20 USDT)
  2. One active loan per borrower
  3. Only whitelisted wallets can borrow
  4. Interest model (currently 2% per day, simple, pro-rated per second)
  5. Repayment = principal + accrued interest (+ buffer behaviour)
- Never weaken access control, remove a check, or widen owner powers to make a test pass. Fix the test or ask.

## Defaults
- Default network is Base Sepolia or the local Hardhat network. Mainnet is opt-in only.
- Use the mock token (`MockUSDT.sol`) in tests and simulations, never real token addresses.
- If unsure whether an action touches real funds, assume it does and ask.

## Honesty
- Do not claim a contract is "secure" or "audited". Say what was checked and what was not.
- If you cannot run tests or tools, say so. Never report tests as passing without running them.
- Separate facts you verified (ran it, read the code) from assumptions.
