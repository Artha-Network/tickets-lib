/**
 * Canonical CBOR helpers.
 *
 * Goals:
 * - Deterministic byte output for the same logical ResolveTicket value.
 * - Interop across languages and runtimes by enforcing canonical map ordering
 *   and shortest integer encodings.
 * - Zero IO and no hidden mutation of inputs.
 *
 * Non goals:
 * - No schema validation here. Callers must validate with `schema.parse` first.
 * - No business logic. This module only translates values to or from bytes.
 *
 * Why canonical CBOR:
 * Signatures depend on bytes, not on abstract objects. Two encoders that both
 * produce "valid" CBOR can still disagree on map key order or integer width.
 * Enabling canonical encoding removes that variability so detached ed25519
 * signatures verify everywhere.
 */

import { encode as cborgEncode, decode as cborgDecode } from "cborg";

/**
 * Ensures we do not accidentally encode `undefined` inside objects or arrays.
 * While CBOR can represent `undefined`, allowing it invites ambiguity between
 * "missing" and "explicitly undefined". Keep the ticket payloads crisp.
 */
function assertNoUndefined(value: unknown, path: string[] = []): void {
  if (value === undefined) {
    throw new Error(
      `undefined encountered at ${path.length ? path.join(".") : "<root>"}`
    );
  }
  if (value === null) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertNoUndefined(value[i], [...path, String(i)]);
    }
    return;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      assertNoUndefined(v, [...path, k]);
    }
  }
}

/**
 * Encode a validated ticket (or any JSON-like value) into canonical CBOR.
 *
 * Determinism rules enforced:
 * - Lexicographic ordering of map keys
 * - Shortest integer representation
 * - UTF 8 for all strings
 *
 * Inputs:
 * - `value` must be JSON like and free of functions, symbols, or BigInt.
 * - Callers should run the Zod schema before encoding to guarantee shape.
 */
export function encodeCbor<T>(value: T): Uint8Array {
  assertNoUndefined(value);
  return cborgEncode(value as unknown, {
    // Canonical aims for deterministic maps and minimal integer width.
    canonical: true
  });
}

/**
 * Decode CBOR bytes back to a plain JS value.
 *
 * Notes:
 * - Decoding does not validate against the ResolveTicket schema. If you need
 *   a typed value, feed the result to `schema.parse(...)`.
 * - This function expects a single CBOR item. If multiple items are concatenated,
 *   only the first is returned by the underlying decoder.
 */
export function decodeCbor<T = unknown>(bytes: Uint8Array): T {
  return cborgDecode(bytes) as T;
}

/**
 * Utility to check that repeated encodes of the same logical value yield
 * identical bytes. Useful in tests and during integration debugging.
 */
export function isDeterministicEncode<T>(value: T): boolean {
  const a = encodeCbor(value);
  const b = encodeCbor(value);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
