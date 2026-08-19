# Task Plan — Trustline

## Critical Path
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-007

## Parallelisable Tasks
- TASK-008 and TASK-009 can be run in parallel once TASK-007 is completed.

---

## Layer 1: Infrastructure

**ID:** TASK-001
**Title:** Set up Hardhat/Foundry project and deployment scripts
**Layer:** 1
**Linked stories:** N/A (Enabler for all)
**Linked component:** All
**Depends on:** None
**Input:** Architecture doc, Target L2 ADR-001.
**Output:** Initialized smart contract project with required dependencies (OpenZeppelin) and a deploy script pointing to an L2 testnet.
**Acceptance condition:** `npm run compile` or `forge build` succeeds without errors, and the deploy script successfully deploys an empty contract to a local node.
**Estimated size:** S
**Risk / notes:** Needs testnet RPC URLs and private keys managed securely via `.env`.

---

## Layer 2: Data Models & Migrations

**ID:** TASK-002
**Title:** Define state variables, structs, and events for TrustlineLendingPool
**Layer:** 2
**Linked stories:** US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008
**Linked component:** TrustlineLendingPool, AccessController
**Depends on:** TASK-001
**Input:** Architecture doc data models.
**Output:** `TrustlineLendingPool.sol` file with `Loan` struct, state variables (`activeLoans`, `whitelist`, `availableLiquidity`, etc.), and events defined. Contract inherits `Ownable` and `Pausable`.
**Acceptance condition:** Contract compiles successfully with no warnings.
**Estimated size:** S
**Risk / notes:** Storage layout should be optimized if possible, though gas is cheap on L2.

---

## Layer 3: API Contracts & Interfaces

**ID:** TASK-003
**Title:** Define function stubs and modifiers
**Layer:** 3
**Linked stories:** US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008
**Linked component:** TrustlineLendingPool, AccessController
**Depends on:** TASK-002
**Input:** API contracts from architecture doc.
**Output:** Function signatures with empty bodies for all external/public functions, modifiers applied (`onlyOwner`, `whenNotPaused`), and custom error definitions (`Unauthorized`, etc.).
**Acceptance condition:** Contract compiles and the generated ABI matches the signatures in the architecture doc.
**Estimated size:** S
**Risk / notes:** None.

---

## Layer 4: Business Logic & Services

**ID:** TASK-004
**Title:** Implement AccessController and Whitelist logic
**Layer:** 4
**Linked stories:** US-001, US-005, US-008
**Linked component:** AccessController
**Depends on:** TASK-003
**Input:** API stubs from TASK-003.
**Output:** Fully implemented functions for `addToWhitelist`, `removeFromWhitelist`, `setInterestRate`, and `pause/unpause`.
**Acceptance condition:** Owner can update whitelist, set interest rate, and pause the contract. State variables update correctly. Non-owner calls revert with `Unauthorized` custom error.
**Estimated size:** S
**Risk / notes:** The owner has absolute control, which is an accepted risk (SPOF).

**ID:** TASK-005
**Title:** Implement Deposit and Withdraw logic
**Layer:** 4
**Linked stories:** US-002, US-003
**Linked component:** TrustlineLendingPool
**Depends on:** TASK-004
**Input:** API stubs for `deposit`, `withdraw`.
**Output:** Implemented functions using `SafeERC20` to transfer USDT. `deposit` enforces the 20 USDT total historical pool size cap. `withdraw` ensures only `availableLiquidity` can be withdrawn.
**Acceptance condition:** Owner can deposit up to max pool size and withdraw available liquidity; non-owners revert. `availableLiquidity` tracks correctly.
**Estimated size:** M
**Risk / notes:** Must handle USDT's non-standard ERC20 behavior (some USDT contracts don't return a boolean), hence `SafeERC20` is mandatory.

**ID:** TASK-006
**Title:** Implement Borrow logic
**Layer:** 4
**Linked stories:** US-004
**Linked component:** TrustlineLendingPool
**Depends on:** TASK-005
**Input:** API stub for `borrow`.
**Output:** Implemented `borrow` function that checks whitelist, pause state, existing active loan, and available liquidity. Updates `activeLoans`, transfers USDT, decreases `availableLiquidity`.
**Acceptance condition:** Whitelisted users with no active loans can borrow up to available liquidity. Function reverts if paused, not whitelisted, has active loan, or insufficient liquidity.
**Estimated size:** M
**Risk / notes:** Reentrancy risk during token transfer; should follow checks-effects-interactions pattern.

**ID:** TASK-007
**Title:** Implement Repay and Interest logic
**Layer:** 4
**Linked stories:** US-006, US-007
**Linked component:** TrustlineLendingPool
**Depends on:** TASK-006
**Input:** API stub for `repay`, ADR-002, ADR-003.
**Output:** Implemented `repay` function that calculates simple interest dynamically based on `block.timestamp` difference. Uses `transferFrom` to pull exact principal + interest. Clears loan struct.
**Acceptance condition:** Borrowers clear debt by transferring exact required amount. Pool liquidity increases. Over-approved allowance only results in exact debt being pulled.
**Estimated size:** M
**Risk / notes:** Precision loss in division for interest calculation. Must ensure division happens last.

---

## Layer 5: UI & Integration

**ID:** TASK-008
**Title:** Write MVP interaction script
**Layer:** 5
**Linked stories:** All
**Linked component:** TrustlineLendingPool, USDT Token
**Depends on:** TASK-007
**Input:** Deployed contract ABI.
**Output:** Ethers.js / Viem script to simulate a full loan cycle against a local network (deposit, whitelist, borrow, time travel, repay).
**Acceptance condition:** Script executes successfully from start to finish without manual intervention, mimicking the success metric from the product brief.
**Estimated size:** S
**Risk / notes:** None.

---

## Layer 6: Hardening & Observability

**ID:** TASK-009
**Title:** Write comprehensive test suite
**Layer:** 6
**Linked stories:** All
**Linked component:** TrustlineLendingPool
**Depends on:** TASK-007
**Input:** Implemented contract.
**Output:** Complete unit and integration tests covering happy paths, sad paths, edge cases, and security controls defined in the user stories.
**Acceptance condition:** All tests pass. 100% branch and line coverage for the smart contract.
**Estimated size:** L
**Risk / notes:** Time manipulation is required in tests to verify interest calculation.

---

## Traceability & Coverage Matrix

### Stories × Tasks
| Story | Description | Implementing Tasks |
|-------|-------------|-------------------|
| US-001 | Manage whitelist | TASK-002, TASK-003, TASK-004 |
| US-002 | Deposit liquidity | TASK-002, TASK-003, TASK-005 |
| US-003 | Withdraw liquidity | TASK-002, TASK-003, TASK-005 |
| US-004 | Borrow USDT | TASK-002, TASK-003, TASK-006 |
| US-005 | Configure interest | TASK-002, TASK-003, TASK-004 |
| US-006 | Accrue interest | TASK-002, TASK-003, TASK-007 |
| US-007 | Repay loan | TASK-002, TASK-003, TASK-007 |
| US-008 | Emergency pause | TASK-002, TASK-003, TASK-004 |

### Components × Tasks
| Component | Implementing Tasks |
|-----------|-------------------|
| TrustlineLendingPool | TASK-002, TASK-003, TASK-005, TASK-006, TASK-007, TASK-009 |
| AccessController | TASK-002, TASK-003, TASK-004 |
| USDT Token (External) | TASK-008 (integration script) |

### Risk Flags × Tasks
| Risk Flag | Mitigation Task |
|-----------|-----------------|
| Owner key centralization / SPOF | Accepted risk; no code task. Mitigated via hardware wallet ops. |
| USDT centralization / Blacklist | Accepted risk; no code task. |
| Regulatory compliance | Accepted risk; no code task. Handled by limiting pool size to 20 USDT. |
