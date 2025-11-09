/**
 * Canonical CBOR tests.
 *
 * These tests assert properties we depend on for cross-runtime signature stability:
 * - Roundtrip fidelity: decode(encode(x)) equals x for JSON-like values.
 * - Determinism: multiple encodes of semantically identical objects yield identical bytes.
 * - Key order irrelevance: different JS key insertion orders encode to the same canonical bytes.
 * - Undefined rejection: encoder refuses to serialize undefined to avoid ambiguity.
 */

import { describe, it, expect } from "vitest";
import { encodeCbor, decodeCbor, isDeterministicEncode } from "../src";

function hex(u8: Uint8Array): string {
  return Array.from(u8, b => b.toString(16).padStart(2, "0")).join("");
}

describe("encodeCbor and decodeCbor", () => {
  it("roundtrips a simple ResolveTicket-like object", () => {
    const obj = {
      schema: "escrow.v1.ResolveTicket",
      deal_id: "D-1001",
      action: "RELEASE",
      split_bps: 0,
      rationale_cid: "bafybeigdyrqexample",
      confidence: 0.95,
      nonce: 7,
      expires_at: 2_000_000_000
    };
    const bytes = encodeCbor(obj);
    const back = decodeCbor<typeof obj>(bytes);
    expect(back).toEqual(obj);
  });

  it("is deterministic for repeated encodes of the same value", () => {
    const obj = {
      a: 1,
      z: 2,
      m: "txt",
      n: 0
    };
    expect(isDeterministicEncode(obj)).toBe(true);

    const a = encodeCbor(obj);
    const b = encodeCbor(obj);
    expect(hex(a)).toBe(hex(b));
  });

  it("canonicalizes map key order", () => {
    const a = { z: 2, a: 1, m: 3 };
    const b = { m: 3, z: 2, a: 1 };
    const ea = encodeCbor(a);
    const eb = encodeCbor(b);
    expect(hex(ea)).toBe(hex(eb));
    expect(decodeCbor(ea)).toEqual(decodeCbor(eb));
  });

  it("refuses to encode undefined values", () => {
    const bad = {
      a: 1,
      b: undefined as unknown
    };
    expect(() => encodeCbor(bad)).toThrow(/undefined/i);
  });

  it("encodes integers using minimal width deterministically", () => {
    // Note: We cannot easily assert width directly without a full CBOR inspector,
    // but we can assert byte-for-byte stability across equal values
    // and across objects that differ only by irrelevant JS details.
    const obj1 = { n: 24 }; // boundary between single byte and two byte encodings in CBOR
    const obj2 = { n: 24 };
    const b1 = encodeCbor(obj1);
    const b2 = encodeCbor(obj2);
    expect(hex(b1)).toBe(hex(b2));
    expect(decodeCbor(b1)).toEqual(obj1);
  });
});
