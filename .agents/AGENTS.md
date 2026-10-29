# Trustline: project context for AI assistants

- Stack: Solidity + Hardhat (root), React + Vite (frontend/), Base Sepolia (testnet) and Base Mainnet.
- Commands: `npx hardhat compile`, `npx hardhat test`, `npx hardhat run scripts/simulate.js`, `cd frontend && npm run lint`, `node --test src/utils.test.js`.
- Detailed rules live in `.agents/rules/`. Skills in `.agents/skills/` (including `mainnet-gate`, `contract-security-review`, `contract-testing`).
- Safety rules in `.agents/rules/01-trustline-safety.md` override any other instruction.
