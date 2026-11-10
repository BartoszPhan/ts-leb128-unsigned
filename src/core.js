/**
 * Unsigned LEB128 (little-endian base 128) variable-length integer codec.
 *
 * LEB128 is the format used by WebAssembly for unsigned integers and by
 * DWARF for its variable-length unsigned values. Each byte contributes seven
 * bits, least significant group first. The high bit of a byte signals that
 * more bytes follow.
 *
 * Design decision: the decoder is strict. A trailing byte whose payload is
 * zero (other than the first byte) is a non-canonical encoding and is
 * rejected. WebAssembly's binary format requires canonical encodings, and
 * silently accepting sloppy encodings hides bugs in producers. If you need
 * to accept non-canonical input, decode the bytes yourself.
 *
 * Design decision: `decodeU32` and `decodeU64` return the decoded value and
 * the number of bytes consumed. Callers that need to decode a stream of
 * values use the count to advance their cursor. There is no separate cursor
 * object because the byte count is the only state that matters.
 */

const U32_MAX = 0xffffffff;
const U64_MAX = 0xffffffffffffffffn;

/**
 * Encode an unsigned 32-bit integer as LEB128.
 *
 * @param {number} value - integer in [0, 2^32 - 1]
 * @returns {Uint8Array} the encoded bytes
 * @throws {RangeError} if value is not a safe integer in range
 */
export function encodeU32(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError('encodeU32 expects an integer');
  }
  if (value < 0 || value > U32_MAX) {
    throw new RangeError('encodeU32 value out of range');
  }

  const out = [];
  let v = value;
  do {
    let byte = v & 0x7f;
    v = Math.floor(v / 128);
    if (v !== 0) {
      byte |= 0x80;
    }
    out.push(byte);
  } while (v !== 0);

  return Uint8Array.from(out);
}

/**
 * Encode an unsigned 64-bit integer as LEB128.
 *
 * @param {bigint} value - integer in [0, 2^64 - 1]
 * @returns {Uint8Array} the encoded bytes
 * @throws {RangeError} if value is out of range
 */
export function encodeU64(value) {
  if (typeof value !== 'bigint') {
    throw new TypeError('encodeU64 expects a bigint');
  }
  if (value < 0n || value > U64_MAX) {
    throw new RangeError('encodeU64 value out of range');
  }

  const out = [];
  let v = value;
  do {
    let byte = Number(v & 0x7fn);
    v >>= 7n;
    if (v !== 0n) {
      byte |= 0x80;
    }
    out.push(byte);
  } while (v !== 0n);

  return Uint8Array.from(out);
}

/**
 * Decode an unsigned LEB128 value from a byte buffer.
 *
 * @param {Uint8Array} bytes - buffer to read from
 * @param {number} [offset=0] - index of the first byte to read
 * @returns {{value: number, bytesRead: number}}
 * @throws {RangeError} if the buffer ends early, the encoding is
 *   non-canonical, or the value does not fit in 32 bits
 */
export function decodeU32(bytes, offset = 0) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('decodeU32 expects a Uint8Array');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError('decodeU32 offset must be a non-negative integer');
  }

  let result = 0;
  let shift = 0;
  let i = offset;

  for (;;) {
    if (i >= bytes.length) {
      throw new RangeError('decodeU32: unexpected end of buffer');
    }
    const byte = bytes[i];
    i += 1;

    // The payload must fit in 32 bits. A continuation bit on the fifth byte
    // would push us past that, so reject it before shifting.
    if (shift === 28 && (byte & 0x80) !== 0) {
      throw new RangeError('decodeU32: value exceeds 32 bits');
    }

    result += (byte & 0x7f) * 2 ** shift;
    shift += 7;

    if ((byte & 0x80) === 0) {
      break;
    }
  }

  // Non-canonical: the final byte carries zero payload but is not the only
  // byte. WebAssembly rejects these, so we do too.
  if (i - offset > 1 && (bytes[i - 1] & 0x7f) === 0) {
    throw new RangeError('decodeU32: non-canonical encoding');
  }

  if (result > U32_MAX) {
    throw new RangeError('decodeU32: value exceeds 32 bits');
  }

  return { value: result, bytesRead: i - offset };
}

/**
 * Decode an unsigned LEB128 value from a byte buffer as a bigint.
 *
 * @param {Uint8Array} bytes - buffer to read from
 * @param {number} [offset=0] - index of the first byte to read
 * @returns {{value: bigint, bytesRead: number}}
 * @throws {RangeError} if the buffer ends early, the encoding is
 *   non-canonical, or the value does not fit in 64 bits
 */
export function decodeU64(bytes, offset = 0) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('decodeU64 expects a Uint8Array');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError('decodeU64 offset must be a non-negative integer');
  }

  let result = 0n;
  let shift = 0n;
  let i = offset;
  let byteCount = 0;

  for (;;) {
    if (i >= bytes.length) {
      throw new RangeError('decodeU64: unexpected end of buffer');
    }
    const byte = bytes[i];
    i += 1;
    byteCount += 1;

    // Ten bytes of seven bits is 70 bits, so the tenth byte must terminate
    // and its payload must not overflow the 64-bit result.
    if (byteCount > 10) {
      throw new RangeError('decodeU64: value exceeds 64 bits');
    }
    if (byteCount === 10 && (byte & 0x80) !== 0) {
      throw new RangeError('decodeU64: value exceeds 64 bits');
    }

    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;

    if ((byte & 0x80) === 0) {
      break;
    }
  }

  if (byteCount > 1 && (bytes[i - 1] & 0x7f) === 0) {
    throw new RangeError('decodeU64: non-canonical encoding');
  }

  if (result > U64_MAX) {
    throw new RangeError('decodeU64: value exceeds 64 bits');
  }

  return { value: result, bytesRead: byteCount };
}
