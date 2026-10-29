export const ERROR_MESSAGES = {
  NotWhitelisted: "You are not whitelisted to borrow. Please ask the pool owner to add your address.",
  LoanAlreadyActive: "You already have an active loan. You must repay it before taking a new loan.",
  InsufficientLiquidity: "The pool does not have enough liquidity to fulfill this borrow amount.",
  InsufficientAvailableLiquidity: "The pool does not have enough available liquidity for this withdrawal.",
  ExceedsMaxPoolSize: "This deposit would exceed the 20 USDT pool cap.",
  EnforcedPause: "The lending pool is currently paused by the owner.",
  ExpectedPause: "The pool is not in the expected paused state.",
  NoActiveLoan: "You do not have an active loan to repay.",
  InsufficientAllowance: "USDT allowance is too low. Please approve the required USDT amount.",
  InvalidAmount: "The specified amount is invalid. It must be greater than 0.",
  Unauthorized: "Caller is not authorized to perform this action.",
  TransferFailed: "USDT token transfer failed. Please check your balance and allowance.",
  OwnableUnauthorizedAccount: "Only the pool owner can perform this action.",
  ERC20InsufficientAllowance: "Insufficient USDT allowance. Please approve the transaction.",
  ERC20InsufficientBalance: "Insufficient USDT balance in your wallet."
};

export const KNOWN_ERROR_SELECTORS = {
  "0x584a7938": "NotWhitelisted",
  "0x6dad0b14": "LoanAlreadyActive",
  "0xbb55fd27": "InsufficientLiquidity",
  "0xd2797635": "ExceedsMaxPoolSize",
  "0x82b42900": "Unauthorized",
  "0x2c5211c6": "InvalidAmount"
};

export const parseError = (e, iface = null) => {
  if (!e) return "An unknown error occurred";

  // Check if error was user rejection in MetaMask/wallet
  if (e?.code === 4001 || e?.code === "ACTION_REJECTED" || 
      (typeof e.message === 'string' && /user rejected/i.test(e.message))) {
    return "Transaction rejected in wallet.";
  }

  // Check if error is insufficient gas funds
  if (e?.code === "INSUFFICIENT_FUNDS" || (typeof e.message === 'string' && /insufficient funds for gas/i.test(e.message))) {
    return "Insufficient ETH for gas fees.";
  }

  // Direct ethers revert name if already parsed by provider
  if (e?.revert?.name && ERROR_MESSAGES[e.revert.name]) {
    return ERROR_MESSAGES[e.revert.name];
  }

  // Extract raw error data if available
  const rawData = e?.data || e?.info?.error?.data || e?.error?.data;

  // Try decoding via Interface if provided
  if (iface && typeof rawData === 'string' && rawData.startsWith('0x')) {
    try {
      const parsed = iface.parseError(rawData);
      if (parsed?.name && ERROR_MESSAGES[parsed.name]) {
        return ERROR_MESSAGES[parsed.name];
      }
      if (parsed?.name) {
        return `Contract error: ${parsed.name}`;
      }
    } catch {
      // Fall through to selector / pattern matching
    }
  }

  // Check known 4-byte selectors (e.g. 0x584a7938)
  if (typeof rawData === 'string') {
    const selector = rawData.slice(0, 10).toLowerCase();
    if (KNOWN_ERROR_SELECTORS[selector] && ERROR_MESSAGES[KNOWN_ERROR_SELECTORS[selector]]) {
      return ERROR_MESSAGES[KNOWN_ERROR_SELECTORS[selector]];
    }
  }

  // Check message / reason string representations
  const errorMsgString = `${e.reason || ''} ${e.message || ''} ${e?.info?.error?.message || ''} ${e?.data?.message || ''}`;

  // Check for the ASCII 4-byte selector representation "XJy8" (0x584a7938 -> NotWhitelisted)
  if (errorMsgString.includes("XJy8") || (typeof rawData === 'string' && rawData.includes("584a7938"))) {
    return ERROR_MESSAGES.NotWhitelisted;
  }

  // Check custom error names in message
  for (const [errorName, friendlyMsg] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsgString.includes(errorName)) {
      return friendlyMsg;
    }
  }

  // Legacy revert string extraction
  let errorMsg = e.reason || e.message || "An unknown error occurred";
  if (e?.info?.error?.message) {
    errorMsg = e.info.error.message;
  } else if (e?.data?.message) {
    errorMsg = e.data.message;
  } else if (typeof e.message === 'string' && e.message.includes('execution reverted:')) {
    const match = e.message.match(/execution reverted: (.*?)(?:",|$)/);
    if (match && match[1]) {
      errorMsg = match[1];
    }
  }

  if (typeof errorMsg === 'string' && errorMsg.startsWith("execution reverted: ")) {
    errorMsg = errorMsg.replace("execution reverted: ", "");
  }

  return errorMsg;
};

export const calculateRemainingCapacity = (maxPool, totalHistorical) => {
  if (typeof maxPool === 'bigint' && typeof totalHistorical === 'bigint') {
    return maxPool > totalHistorical ? maxPool - totalHistorical : 0n;
  }
  const max = Number(maxPool) || 0;
  const current = Number(totalHistorical) || 0;
  return Math.max(0, max - current);
};

export const validateDepositAmount = (amount, remainingCapacity) => {
  if (amount === undefined || amount === null || amount === '') {
    return { valid: false, error: "Please enter an amount" };
  }
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: "Deposit amount must be greater than 0" };
  }
  const maxCap = Number(remainingCapacity);
  if (!isNaN(maxCap) && maxCap >= 0 && num > maxCap) {
    return { valid: false, error: `Amount exceeds remaining capacity (${maxCap} USDT)` };
  }
  return { valid: true };
};
