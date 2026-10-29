import test from 'node:test';
import assert from 'node:assert';
import { parseError, calculateRemainingCapacity, validateDepositAmount } from './utils.js';

test('parseError - extracts from basic e.message', () => {
    const error = { message: "execution reverted: ERC20: transfer amount exceeds balance" };
    assert.strictEqual(parseError(error), "ERC20: transfer amount exceeds balance");
});

test('parseError - decodes ExceedsMaxPoolSize into a user-friendly message', () => {
    const error = {
        message: "something else",
        info: {
            error: {
                message: "execution reverted: ExceedsMaxPoolSize()"
            }
        }
    };
    assert.strictEqual(parseError(error), "This deposit would exceed the 20 USDT pool cap.");
});

test('parseError - decodes InvalidAmount into a user-friendly message', () => {
    const error = {
        message: "something else",
        data: {
            message: "execution reverted: InvalidAmount()"
        }
    };
    assert.strictEqual(parseError(error), "The specified amount is invalid. It must be greater than 0.");
});

test('parseError - decodes ASCII custom error selector XJy8 as NotWhitelisted', () => {
    const error = { message: "Internal JSON-RPC error: XJy8" };
    assert.strictEqual(parseError(error), "You are not whitelisted to borrow. Please ask the pool owner to add your address.");
});

test('parseError - decodes hex 4-byte selector 0x584a7938 as NotWhitelisted', () => {
    const error = { data: "0x584a7938" };
    assert.strictEqual(parseError(error), "You are not whitelisted to borrow. Please ask the pool owner to add your address.");
});

test('parseError - decodes user rejection in wallet', () => {
    const error = { code: 4001, message: "User rejected the request." };
    assert.strictEqual(parseError(error), "Transaction rejected in wallet.");
});

test('parseError - extracts stringified message with extra quotes for unknown reverts', () => {
    const error = { message: 'execution reverted: ERC20: transfer amount exceeds balance", data: "0x08c...' };
    assert.strictEqual(parseError(error), "ERC20: transfer amount exceeds balance");
});

test('parseError - falls back to e.reason if present and no deeply nested object', () => {
    const error = { reason: "Some network reason" };
    assert.strictEqual(parseError(error), "Some network reason");
});

test('parseError - returns default if nothing is provided', () => {
    assert.strictEqual(parseError(null), "An unknown error occurred");
    assert.strictEqual(parseError({}), "An unknown error occurred");
});

test('calculateRemainingCapacity - handles BigInt values for empty, partial, and full pool', () => {
    const maxPool = 20000000n;
    assert.strictEqual(calculateRemainingCapacity(maxPool, 0n), 20000000n);
    assert.strictEqual(calculateRemainingCapacity(maxPool, 12000000n), 8000000n);
    assert.strictEqual(calculateRemainingCapacity(maxPool, 20000000n), 0n);
    assert.strictEqual(calculateRemainingCapacity(maxPool, 25000000n), 0n);
});

test('calculateRemainingCapacity - handles standard numbers', () => {
    assert.strictEqual(calculateRemainingCapacity(20, 0), 20);
    assert.strictEqual(calculateRemainingCapacity(20, 12), 8);
    assert.strictEqual(calculateRemainingCapacity(20, 20), 0);
    assert.strictEqual(calculateRemainingCapacity(20, 25), 0);
});

test('validateDepositAmount - accepts valid deposit amount within capacity', () => {
    assert.deepStrictEqual(validateDepositAmount('5', '8'), { valid: true });
    assert.deepStrictEqual(validateDepositAmount('8', '8'), { valid: true });
    assert.deepStrictEqual(validateDepositAmount(5, 8), { valid: true });
});

test('validateDepositAmount - rejects amounts exceeding remaining capacity', () => {
    const res = validateDepositAmount('12', '8');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Amount exceeds remaining capacity (8 USDT)');
});

test('validateDepositAmount - rejects zero or negative amounts', () => {
    const zeroRes = validateDepositAmount('0', '8');
    assert.strictEqual(zeroRes.valid, false);
    assert.strictEqual(zeroRes.error, 'Deposit amount must be greater than 0');

    const negRes = validateDepositAmount('-5', '8');
    assert.strictEqual(negRes.valid, false);
    assert.strictEqual(negRes.error, 'Deposit amount must be greater than 0');
});

test('validateDepositAmount - rejects empty, null, or non-numeric inputs', () => {
    assert.strictEqual(validateDepositAmount('', '8').valid, false);
    assert.strictEqual(validateDepositAmount(null, '8').valid, false);
    assert.strictEqual(validateDepositAmount(undefined, '8').valid, false);
    assert.strictEqual(validateDepositAmount('abc', '8').valid, false);
});
