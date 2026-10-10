import test from 'node:test';
import assert from 'node:assert';
import { parseError } from './utils.js';

test('parseError - extracts from basic e.message', () => {
    const error = { message: "execution reverted: ERC20: transfer amount exceeds balance" };
    assert.strictEqual(parseError(error), "ERC20: transfer amount exceeds balance");
});

test('parseError - extracts from nested e.info.error.message', () => {
    const error = {
        message: "something else",
        info: {
            error: {
                message: "execution reverted: ExceedsMaxPoolSize()"
            }
        }
    };
    assert.strictEqual(parseError(error), "ExceedsMaxPoolSize()");
});

test('parseError - extracts from nested e.data.message', () => {
    const error = {
        message: "something else",
        data: {
            message: "execution reverted: InvalidAmount()"
        }
    };
    assert.strictEqual(parseError(error), "InvalidAmount()");
});

test('parseError - extracts stringified message with extra quotes', () => {
    const error = { message: 'execution reverted: ERC20: transfer amount exceeds balance", data: "0x08c...' };
    assert.strictEqual(parseError(error), "ERC20: transfer amount exceeds balance");
});

test('parseError - falls back to e.reason if present and no deeply nested object', () => {
    const error = { reason: "User rejected transaction" };
    assert.strictEqual(parseError(error), "User rejected transaction");
});

test('parseError - returns default if nothing is provided', () => {
    assert.strictEqual(parseError(null), "An unknown error occurred");
    assert.strictEqual(parseError({}), "An unknown error occurred");
});
