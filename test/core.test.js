import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  encodeU32,
  decodeU32,
  encodeU64,
  decodeU64,
} from '../src/index.js';

test('encodeU32 encodes zero as a single zero byte', () => {
  assert.deepEqual(Array.from(encodeU32(0)), [0x00]);
});

test('encodeU32 encodes small values in one byte', () => {
  assert.deepEqual(Array.from(encodeU32(1)), [0x01]);
  assert.deepEqual(Array.from(encodeU32(127)), [0x7f]);
});

test('encodeU32 crosses the one-byte boundary at 128', () => {
  assert.deepEqual(Array.from(encodeU32(128)), [0x80, 0x01]);
  assert.deepEqual(Array.from(encodeU32(300)), [0xac, 0x02]);
});

test('encodeU32 encodes the 32-bit maximum as five bytes', () => {
  assert.deepEqual(Array.from(encodeU32(0xffffffff)), [0xff, 0xff, 0xff, 0xff, 0x0f]);
});

test('encodeU32 rejects out-of-range and non-integer values', () => {
  assert.throws(() => encodeU32(-1), RangeError);
  assert.throws(() => encodeU32(0x100000000), RangeError);
  assert.throws(() => encodeU32(1.5), TypeError);
  assert.throws(() => encodeU32('1'), TypeError);
});

test('decodeU32 round-trips boundary values', () => {
  for (const v of [0, 1, 127, 128, 300, 0xffffffff]) {
    const decoded = decodeU32(encodeU32(v));
    assert.equal(decoded.value, v);
    assert.equal(decoded.bytesRead, encodeU32(v).length);
  }
});

test('decodeU32 honours the offset argument', () => {
  const bytes = new Uint8Array([0xaa, 0xac, 0x02, 0xbb]);
  const decoded = decodeU32(bytes, 1);
  assert.equal(decoded.value, 300);
  assert.equal(decoded.bytesRead, 2);
});

test('decodeU32 rejects a truncated buffer', () => {
  assert.throws(() => decodeU32(new Uint8Array([0x80])), RangeError);
});

test('decodeU32 rejects a value that does not fit in 32 bits', () => {
  // Six bytes of 0xff payload with continuation bits set exceeds 32 bits.
  assert.throws(() => decodeU32(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x8f, 0x00])), RangeError);
});

test('decodeU32 rejects non-canonical encodings', () => {
  // 0 encoded in two bytes: second byte has zero payload.
  assert.throws(() => decodeU32(new Uint8Array([0x80, 0x00])), RangeError);
});

test('decodeU32 rejects a negative offset', () => {
  assert.throws(() => decodeU32(new Uint8Array([0x00]), -1), RangeError);
});

test('encodeU64 encodes zero and small values', () => {
  assert.deepEqual(Array.from(encodeU64(0n)), [0x00]);
  assert.deepEqual(Array.from(encodeU64(127n)), [0x7f]);
  assert.deepEqual(Array.from(encodeU64(128n)), [0x80, 0x01]);
});

test('encodeU64 encodes the 64-bit maximum as ten bytes', () => {
  assert.deepEqual(
    Array.from(encodeU64(0xffffffffffffffffn)),
    [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01],
  );
});

test('encodeU64 rejects out-of-range and non-bigint values', () => {
  assert.throws(() => encodeU64(-1n), RangeError);
  assert.throws(() => encodeU64(0x10000000000000000n), RangeError);
  assert.throws(() => encodeU64(1), TypeError);
});

test('decodeU64 round-trips boundary values', () => {
  for (const v of [0n, 1n, 127n, 128n, 300n, 0xffffffffffffffffn]) {
    const decoded = decodeU64(encodeU64(v));
    assert.equal(decoded.value, v);
    assert.equal(decoded.bytesRead, encodeU64(v).length);
  }
});

test('decodeU64 honours the offset argument', () => {
  const bytes = new Uint8Array([0xaa, 0xac, 0x02, 0xbb]);
  const decoded = decodeU64(bytes, 1);
  assert.equal(decoded.value, 300n);
  assert.equal(decoded.bytesRead, 2);
});

test('decodeU64 rejects a truncated buffer', () => {
  assert.throws(() => decodeU64(new Uint8Array([0x80])), RangeError);
});

test('decodeU64 rejects a value that does not fit in 64 bits', () => {
  // Eleven bytes is more than the ten needed for 64 bits.
  assert.throws(
    () => decodeU64(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01])),
    RangeError,
  );
});

test('decodeU64 rejects non-canonical encodings', () => {
  assert.throws(() => decodeU64(new Uint8Array([0x80, 0x00])), RangeError);
});

test('decodeU64 rejects a negative offset', () => {
  assert.throws(() => decodeU64(new Uint8Array([0x00]), -1), RangeError);
});
