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
