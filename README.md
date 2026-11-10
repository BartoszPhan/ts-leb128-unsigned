# ts-leb128-unsigned

Encodes and decodes unsigned LEB128 (little-endian base 128) variable-length integers, the format used by WebAssembly and DWARF.

## Usage

```js
import { encodeU32, decodeU32, encodeU64, decodeU64 } from 'ts-leb128-unsigned';

const bytes = encodeU32(300);
// Uint8Array [ 0xac, 0x02 ]

const { value, bytesRead } = decodeU32(bytes);
// value === 300, bytesRead === 2

// 64-bit values use bigint.
const wide = encodeU64(0xffffffffffffffffn);
const decoded = decodeU64(wide);
// decoded.value === 0xffffffffffffffffn
// decoded.bytesRead === 10
```

`decodeU32` and `decodeU64` accept an optional `offset` and return an object with `value` and `bytesRead` so callers can walk a stream of values.

## Why this exists

WebAssembly and DWARF both store unsigned integers as LEB128, but the encoding is easy to get subtly wrong: the continuation bit is the high bit of each byte, and a value's low seven bits come first. This library keeps the encoder and decoder small and strict so that a malformed stream fails loudly instead of producing a plausible-looking wrong number.

The trade-off is strictness. The decoder rejects non-canonical encodings (a trailing zero payload byte in a multi-byte value) and values that overflow the target width. WebAssembly's binary format requires canonical encodings, so accepting sloppy input would hide producer bugs. If you need to read non-canonical LEB128, decode the bytes yourself.

## The awkward edge

A multi-byte LEB128 value whose final byte has a zero payload is non-canonical: `0x80 0x00` decodes to zero but is two bytes where one would do. This library rejects it with a `RangeError`. The same applies to values that exceed 32 or 64 bits: the decoder throws rather than truncating.

## API

- `encodeU32(value: number): Uint8Array`
- `encodeU64(value: bigint): Uint8Array`
- `decodeU32(bytes: Uint8Array, offset?: number): { value: number, bytesRead: number }`
- `decodeU64(bytes: Uint8Array, offset?: number): { value: bigint, bytesRead: number }`
