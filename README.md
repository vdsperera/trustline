# Trustline Lending Pool

Trustline is an automated smart contract lending pool for managing small, short-term loans among a closed group of friends. 

## Problem It Solves
Tracking who owes what, calculating interest, and managing repayments manually via bank transfers is tedious and error-prone. Trustline automates all accounting, enforces strict borrowing limits (you can't take a new loan if you already have an active one), and calculates daily interest autonomously.

## Features
- **Whitelist Management**: Only pre-approved friend wallets can participate in borrowing.
- **Automated Interest**: Calculates interest daily based on a configurable rate (default 2%).
- **Lending Pool**: The owner (liquidity provider) can deposit and withdraw funds.
- **Single Transaction Repayment**: Borrowers repay the full principal + accrued interest at once to clear their debt.
- **Uncollateralized**: Relies on real-world social trust, rather than collateral.

## Smart Contracts
The core smart contract logic is implemented in Solidity and requires a low-fee EVM-compatible network (like Polygon, Arbitrum, or Base) to ensure that transaction fees do not exceed loan amounts.

## Project Structure
- `contracts/`: Solidity smart contracts.
- `scripts/`: Deployment and interaction scripts.
- `test/`: Hardhat/Chai test suite.
- `docs/`: Project documentation including product briefs, architecture, and task handoffs.

## Developer Setup

### Prerequisites
- Node.js >= 18
- npm

### Installation
Clone the repository and install dependencies:
```bash
npm install
```

### Compilation
Compile the smart contracts using Hardhat:
```bash
npx hardhat compile
```

### Testing
Run the comprehensive test suite:
```bash
npx hardhat test
```

### Simulation
Run the interaction script to simulate an end-to-end borrowing lifecycle (depositing, borrowing, time-travel, and repaying) on a local Hardhat network:
```bash
npx hardhat run scripts/simulate.js
```
