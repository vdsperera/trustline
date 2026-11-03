# System Design Document — Trustline

## 1. Component Map

### Component 1: TrustlineLendingPool
- **Name**: TrustlineLendingPool (Smart Contract)
- **Responsibility**: Manages USDT liquidity, borrowing/repayment logic, and interest accrual.
- **Exposes**: `deposit`, `withdraw`, `borrow`, `repay`
- **Depends on**: AccessController, USDT ERC20 contract
- **Data owned**: Pool balances, active loans (principal, start time, interest rate).
- **Technology**: Solidity (EVM) — standard language for smart contracts on L2s.
- **Scaling strategy**: N/A for smart contracts (handled by L2 network throughput).
- **Failure mode**: Hard failure — reverts state changes on invalid input or insufficient funds to prevent inconsistent states.

### Component 2: AccessController
- **Name**: AccessController (Smart Contract Module)
- **Responsibility**: Manages owner authorization, the borrower whitelist, and emergency pause state.
- **Exposes**: `addToWhitelist`, `removeFromWhitelist`, `setInterestRate`, `pause`, `unpause`
- **Depends on**: None.
- **Data owned**: Whitelist mappings, owner address, global interest rate, global pause state.
- **Technology**: Solidity (OpenZeppelin `Ownable` and `Pausable`).
- **Scaling strategy**: N/A.
- **Failure mode**: Hard failure — reverts on unauthorized access.

### Component 3: USDT Token (External)
- **Name**: USDT Token
- **Responsibility**: Standard ERC20 token contract managing user underlying asset balances.
- **Exposes**: `transfer`, `transferFrom`, `approve`, `balanceOf`
- **Depends on**: N/A.
- **Data owned**: User USDT balances and allowances.
- **Technology**: ERC20 standard.
- **Scaling strategy**: Handled by L2 network.
- **Failure mode**: Reverts on insufficient balance or allowance.

### Component 4: Trustline Frontend Application
- **Name**: Trustline Frontend (`frontend/src/`)
- **Responsibility**: Provides role-based user interfaces (Pool Owner vs Whitelisted Borrower), handles wallet connections, visualizes real-time interest and Rupee conversions, discovers whitelisted peers, and decodes EVM revert errors.
- **Exposes**:
  - `parseError(e, iface)`: Decodes 4-byte EVM custom error selectors (`0x584a7938`, `ExceedsMaxPoolSize`, etc.) into user-friendly strings.
  - `calculateRemainingCapacity(maxPool, totalHistorical)`: Computes headroom available for deposits up to the 20 USDT cap.
  - `validateDepositAmount(amount, remainingCapacity)`: Enforces deposit headroom constraints prior to wallet submission.
  - `isValidNumericInput(value)`: Sanitizes numeric input without triggering mobile software keyboard locks.
- **Depends on**: `TrustlineLendingPool` (Smart Contract), `USDT` (ERC20 Contract), Browser Web3 Provider (EIP-1193).
- **Data owned**: Local contact nicknames (`localStorage`), customizable USDT/LKR exchange rate (`localStorage`).
- **Technology**: React 18, Vite, Ethers.js v6, CSS Glassmorphic design tokens.
- **Scaling strategy**: Static client distribution (Vercel/Netlify/IPFS).
- **Failure mode**: Displays non-blocking glassmorphic toast notifications; falls back to standard input behavior if local storage is restricted.

---

## 2. API Contracts (Smart Contract Interface)

### Inter-component Interfaces / External ABIs

#### `deposit(uint256 amount)`
- **Request**: `amount` to deposit.
- **Response**: Reverts on failure, emits `Deposited` event on success.
- **Error codes**: `Unauthorized`, `ExceedsMaxPoolSize`, `TransferFailed`
- **Auth requirement**: Owner only.
- **Idempotency**: Not idempotent (each call deposits more funds).

#### `withdraw(uint256 amount)`
- **Request**: `amount` to withdraw.
- **Response**: Reverts on failure, emits `Withdrawn` event on success.
- **Error codes**: `Unauthorized`, `InsufficientAvailableLiquidity`, `TransferFailed`
- **Auth requirement**: Owner only.
- **Idempotency**: Not idempotent.

#### `borrow(uint256 amount)`
- **Request**: `amount` to borrow.
- **Response**: Reverts on failure, emits `Borrowed` event on success.
- **Error codes**: `NotWhitelisted`, `ContractPaused`, `LoanAlreadyActive`, `InsufficientLiquidity`, `TransferFailed`
- **Auth requirement**: Whitelisted user.
- **Idempotency**: Not idempotent.

#### `repay()`
- **Request**: No amount needed (contract calculates exact amount required).
- **Response**: Reverts on failure, emits `Repaid` event on success.
- **Error codes**: `NoActiveLoan`, `TransferFailed`, `InsufficientAllowance`
- **Auth requirement**: Any user with an active loan (even if removed from whitelist).
- **Idempotency**: Idempotent (calling it twice will revert the second time due to `NoActiveLoan`).

#### `addToWhitelist(address user)` / `removeFromWhitelist(address user)`
- **Request**: `user` address.
- **Response**: Emits `WhitelistUpdated`.
- **Error codes**: `Unauthorized`
- **Auth requirement**: Owner only.
- **Idempotency**: Idempotent.

#### `setInterestRate(uint256 dailyRate)`
- **Request**: `dailyRate` (represented in basis points or percentage).
- **Response**: Emits `InterestRateUpdated`.
- **Error codes**: `Unauthorized`
- **Auth requirement**: Owner only.
- **Idempotency**: Idempotent.

---

## 3. Data Models

### Entities & Storage

#### `Loan` (Struct)
- **Fields**: 
  - `principal` (uint256): Amount borrowed.
  - `startTime` (uint256): Timestamp of the borrow.
  - `dailyInterestRate` (uint256): The interest rate active at the time of borrowing.
- **Storage**: Ethereum Contract Storage.
- **Ownership**: `TrustlineLendingPool`

#### Contract State Variables
- `activeLoans`: `mapping(address => Loan)` — maps user addresses to their active loan.
- `whitelist`: `mapping(address => bool)` — maps user addresses to their whitelist status.
- `availableLiquidity`: `uint256` — tracks currently available USDT in the pool.
- `globalDailyInterestRate`: `uint256` — current interest rate for new loans.
- `totalHistoricalPoolSize`: `uint256` — enforces the 20 USDT hard cap on deposits.

---

## 4. NFR Mapping

| NFR | Architectural Decision |
|---|---|
| **Low gas fees** | Deploy exclusively on a low-cost L2 EVM network (e.g., Base, Polygon, Arbitrum). (ADR-001) |
| **Precise interest calculation** | Use `block.timestamp` difference to calculate pro-rata simple interest on the fly during the `repay` transaction. (ADR-002) |
| **Security & Access Control** | Use established OpenZeppelin `Ownable`, `Pausable`, and `SafeERC20` libraries to reduce attack surface. |
| **Simplicity in Repayment** | Require full exact repayment in a single transaction; no partial payment tracking. (ADR-003) |

---

## 5. Risk Flags

- **Single point of failure with no fallback**: The Owner's private key controls the pool funds (via `withdraw`) and whitelist. 
  - *Consequence*: If the key is compromised, an attacker can steal the 20 USDT pool or whitelist themselves to borrow it.
  - *Mitigation*: Owner should use a hardware wallet or a simple Multi-Sig wallet (like Safe) to manage the contract.

- **Third-party API with no circuit breaker**: USDT is a centralized token that can be paused or blacklisted by Tether.
  - *Consequence*: If the contract address is blacklisted, funds are permanently stuck.
  - *Mitigation*: Acceptable risk for a 20 USDT pool. No technical mitigation possible without switching to a decentralized stablecoin (e.g., DAI/USDC), but USDT is requested.

- **Compliance requirement with no corresponding design control**: Lending money and generating interest could technically classify as an unlicensed lending operation.
  - *Consequence*: Regulatory scrutiny.
  - *Mitigation*: The hard cap of 20 USDT and closed whitelist ensures this remains a private, small-scale arrangement among friends, flying below regulatory radar.

---

## 6. Architecture Decision Records (ADRs)

### ID: ADR-001
**Title:** Target Network and Language
**Status:** Accepted
**Context:** High gas fees on Ethereum Mainnet make small loans (max 20 USDT) economically unviable, as fees would dwarf the principal.
**Options considered:** 
1. Deploy on ETH Mainnet (high fees, high security).
2. Deploy on an EVM-compatible L2 like Base or Polygon (low fees, good security).
**Decision:** Deploy on an EVM-compatible L2 using Solidity.
**Consequences:** Gas fees will be cents instead of dollars. Users must bridge their USDT to the L2 network to participate.

### ID: ADR-002
**Title:** Interest Calculation Methodology
**Status:** Accepted
**Context:** The contract needs to calculate a 2% daily interest rate pro-rata per second.
**Options considered:** 
1. Iterative loop compounding (expensive gas, risks hitting block gas limits).
2. Formula-based simple interest calculated dynamically at repayment time.
**Decision:** Formula-based simple interest. Store the rate at borrow time in the `Loan` struct. At repayment, calculate: `Interest = Principal * Rate * (CurrentTime - StartTime) / SECONDS_IN_DAY`.
**Consequences:** Extremely gas efficient. Prevents complex state updates. Means interest is simple, not compounded, which aligns with MVP simplicity.

### ID: ADR-003
**Title:** Full Repayment Enforcement
**Status:** Accepted
**Context:** Borrowers need to clear their debt to borrow again.
**Options considered:** 
1. Support partial repayments (requires tracking remaining balance, recalculating interest on a smaller principal).
2. Require full exact repayment in a single transaction.
**Decision:** Require full repayment via a single `repay()` function that uses `transferFrom` to pull the exact calculated amount (principal + accrued interest).
**Consequences:** Drastically simplifies contract logic and state. Prevents "dust" loans. If a user approves a higher amount than needed, the contract still only pulls the exact debt, ensuring safety.

### ID: ADR-004
**Title:** Hybrid On-Chain Whitelist Discovery with Client-Side Alias Persistence
**Status:** Accepted
**Context:** Storing human-readable friend nicknames on-chain consumes unnecessary gas and storage, while storing addresses purely in `localStorage` loses the directory across multiple devices or cleared browser caches.
**Options considered:**
1. Store `string name` on-chain inside the contract (high gas cost per add/edit).
2. Rely solely on client-side `localStorage` (loses track of friends when switching devices or clearing browser data).
3. Hybrid approach: query historical `WhitelistUpdated` events from the blockchain on wallet connection, and merge with client-side nickname mappings.
**Decision:** Implement the hybrid approach. The frontend scans `WhitelistUpdated` events from block 0 to construct the source of truth for whitelisted addresses, while user-defined nicknames are stored in `localStorage` with inline renaming controls.
**Consequences:** 0-gas overhead for nickname management; 100% address persistence across devices and browser sessions.

### ID: ADR-005
**Title:** Text-Based Decimal Input over HTML5 Number Input for Mobile WebViews
**Status:** Accepted
**Context:** Mobile wallet in-app browsers (MetaMask Mobile, Coinbase Wallet) lock up virtual keyboards and refuse to backspace or type when `<input type="number">` is combined with React controlled state and `min`/`step` constraints.
**Options considered:**
1. Standard `<input type="number">` with native spinners.
2. Custom virtual keypad rendered in HTML/React.
3. `<input type="text" inputMode="decimal" autoComplete="off">` combined with client-side numeric regex validation.
**Decision:** Use `type="text"` with `inputMode="decimal"` and a clean regex sanitizer (`isValidNumericInput`).
**Consequences:** Triggers the native mobile decimal keypad without triggering the browser's C++ number parser or WebView virtual keyboard desynchronization bugs. Allows smooth backspacing and empty input states.

### ID: ADR-006
**Title:** Client-Side Simple Interest Mirroring with Repayment Allowance Buffer
**Status:** Accepted
**Context:** The smart contract calculates simple interest on the fly during `repay()` but does not expose a read-only view function for accrued interest.
**Options considered:**
1. Upgrade the smart contract to add an `accumulatedDebt(address)` view function.
2. Mirror the simple interest formula in the frontend (`Principal * Rate * TimeElapsed / SECONDS_IN_DAY`) and add a 5-minute interest buffer to the USDT approval before calling `repay()`.
**Decision:** Mirror the formula client-side and apply a 5-minute approval buffer.
**Consequences:** Avoids redeploying the core lending pool contract while preventing transaction reverts caused by time advancing between token approval and transaction execution.
