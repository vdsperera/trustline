export const parseError = (e) => {
  if (!e) return "An unknown error occurred";
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
