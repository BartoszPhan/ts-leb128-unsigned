/**
 * Public entry point for ts-leb128-unsigned.
 *
 * Re-exports the encoder and decoder so consumers can import from the
 * package root without reaching into `core.js`.
 */

export { encodeU32, decodeU32, encodeU64, decodeU64 } from './core.js';
