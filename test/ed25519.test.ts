/**
 * ed25519 signing and verification tests.
 *
 * Objectives
 * - Deterministic key derivation from a fixed seed for reproducible tests.
 * - Happy path: sign -> verify returns true.
 * - Negative paths: wrong public key, mutated message, wrong signature length.
 * - Hex helpers interop sanity.
 *
 * Run:
 *   pnpm test
 */

import { describe, it, expect } from "vitest";
import {
  sign,
  verify,
  derivePublicKey,
  toHex,
  hexToBytes,
  bytesToHex
} from "../src";

// Fixed 32-byte test seed (hex), not used in production.
// 00..1f pattern keeps fixtures human-readable.
const TEST_SEED_HEX =
  "000102030405060708090a0b0c0d0e0f" +
  "101112131415161718191a1b1c1d1e1f";

function msgBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("ed25519 helpers", () => {
  it("derives a public key from a 32-byte seed", () => {
    const pk = derivePublicKey(TEST_SEED_HEX);
    // Basic shape checks
    expect(pk).toBeInstanceOf(Uint8Array);
    expect(pk.length).toBe(32);
    // Hex helpers produce lowercase by default
    const hex = toHex(pk);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("signs and verifies a message", () => {
    const pk = derivePublicKey(TEST_SEED_HEX);
    const m = msgBytes("hello world");
    const sig = sign(m, TEST_SEED_HEX);

    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBe(64);
    expect(verify(m, sig, pk)).toBe(true);
  });

  it("fails verification with mutated message", () => {
    const pk = derivePublicKey(TEST_SEED_HEX);
    const m1 = msgBytes("immutable bytes");
    const m2 = msgBytes("immutable bytes!"); // note extra punctuation
    const sig = sign(m1, TEST_SEED_HEX);

    expect(verify(m2, sig, pk)).toBe(false);
  });

  it("fails verification with wrong public key", () => {
    const pk1 = derivePublicKey(TEST_SEED_HEX);
    // Slightly different seed to simulate another signer
    const pk2 = derivePublicKey(
      "ffffffffffffffffffffffffffffffff" + "00000000000000000000000000000000"
    );
    const m = msgBytes("auth check");
    const sig = sign(m, TEST_SEED_HEX);

    expect(verify(m, sig, pk1)).toBe(true);
    expect(verify(m, sig, pk2)).toBe(false);
  });

  it("rejects invalid signature length", () => {
    const pk = derivePublicKey(TEST_SEED_HEX);
    const m = msgBytes("length check");
    const sig = sign(m, TEST_SEED_HEX);

    // Truncate signature to 63 bytes
    const bad = sig.slice(0, 63);
    expect(() => verify(m, bad, pk)).toThrow(/length/i);
  });

  it("hex utilities convert round-trip with and without 0x prefix", () => {
    const pk = derivePublicKey(TEST_SEED_HEX);
    const hexBare = bytesToHex(pk);
    const hexPref = bytesToHex(pk, { prefix: true });

    expect(hexBare).toHaveLength(64);
    expect(hexPref).toHaveLength(66);
    expect(hexPref.startsWith("0x")).toBe(true);

    expect(hexToBytes(hexBare)).toEqual(pk);
    expect(hexToBytes(hexPref)).toEqual(pk);
  });
});
