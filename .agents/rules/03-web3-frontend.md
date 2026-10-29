# Web3 Frontend Standards (apply to files in frontend/)

- The frontend is untrusted UI. Every rule that matters is enforced by the contract; the UI only helps users avoid mistakes. Never rely on UI checks for security.
- Money values: use `BigInt` (or the library's big-number type) and the token's decimals (6 for USDT). Never use floating point for token amounts. Interest shown in the UI is an estimate and must be labelled "estimated".
- Contract and token addresses come from `VITE_*` env vars. Validate them at startup (valid address format) and fail with a clear error if missing.
- `VITE_*` variables are public in the built bundle. Never put secrets in them.
- Verify the connected chain ID matches the configured network before any write. Show a clear "wrong network" state with a switch prompt.
- Every transaction flow handles: user rejected, insufficient balance, insufficient allowance (approve step), reverted tx, pending state, confirmed state. No silent failures.
- Decode custom contract errors into plain-language messages.
- Show the network (Sepolia vs Mainnet) prominently so users never confuse test and real funds.
- The real-time interest display must use the same formula as the contract and be covered by unit tests in `frontend/src/utils.test.js`.
- Accessibility: buttons have labels, status is not conveyed by colour alone, forms are keyboard-usable.
