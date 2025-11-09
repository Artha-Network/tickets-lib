/**
 * Byte encoding utilities.
 *
 * These helpers keep all hex handling consistent across the codebase
 * so we don't end up with mixed prefixes, inconsistent casing, or
 * suspicious odd-length strings that explode at runtime.
 *
 * Design rules
 * - Hex strings may be prefixed with "0x" (upper or lower) or bare.
 * - Output hex is lowercase by default to avoid accidental diffs.
 * - No silent truncation or padding. If input is malformed, throw.
 *
 * Runtime guarantees
 * - `hexToBytes` returns a new Uint8Array with length = hex.length / 2.
 * - `bytesToHex` returns a string of length = bytes.length * 2 (+2 if prefix).
 */

/**
 * Convert a hex string to bytes.
 *
 * Accepts:
 * - "0x" prefixed or bare hex
 * - Uppercase or lowercase characters
 *
 * Throws:
 * - If input contains non-hex characters
 * - If length (after trimming prefix) is zero or odd
 *
 * @example
 * hexToBytes("0xdeadbeef") // => Uint8Array [ 0xde, 0xad, 0xbe, 0xef ]
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string") {
    throw new TypeError("hex must be a string");
  }
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;

  if (clean.length === 0) {
    throw new Error("hex string is empty");
  }
  if (clean.length % 2 !== 0) {
    throw new Error("hex string must have an even length");
  }
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error("hex string contains non-hex characters");
  }

  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = clean.slice(i * 2, i * 2 + 2);
    out[i] = parseInt(byte, 16);
  }
  return out;
}

/**
 * Convert bytes to a hex string.
 *
 * Options:
 * - prefix: include "0x" at the start (default false)
 * - uppercase: render A–F in uppercase (default false; library standard is lowercase)
 *
 * @example
 * bytesToHex(new Uint8Array([0xde, 0xad]), { prefix: true }) // "0xdead"
 */
export function bytesToHex(
  bytes: Uint8Array,
  opts?: { prefix?: boolean; uppercase?: boolean }
): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bytes must be a Uint8Array");
  }
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  const rendered = opts?.uppercase ? hex.toUpperCase() : hex;
  return opts?.prefix ? `0x${rendered}` : rendered;
}
