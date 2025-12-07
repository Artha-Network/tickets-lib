// src/resolveTicketTransport.ts
//
// JSON-friendly "envelope" for ResolveTicket over HTTP / logs / DB.
// Uses hex strings so it fits anywhere.
//
// Envelope structure:
// {
//   schema: "escrow.v1.ResolveTicketEnvelope",
//   ticket_cbor_hex: "...",
//   signature_hex: "...",
//   pubkey_hex: "..."
// }

import {
  SignedTicket,
  decodeAndVerifyTicket,
  DecodeVerifyOptions,
} from "./resolveTicketHelpers";

export type ResolveTicketEnvelopeSchema =
  "escrow.v1.ResolveTicketEnvelope";

export interface ResolveTicketEnvelope {
  schema: ResolveTicketEnvelopeSchema;
  ticket_cbor_hex: string;
  signature_hex: string;
  pubkey_hex: string;
}

/**
 * Convert a SignedTicket into a JSON-friendly envelope.
 * `pubkeyHex` is whatever encoding your ecosystem uses (e.g. Solana pubkey).
 */
export function toEnvelope(
  signed: SignedTicket,
  pubkeyHex: string
): ResolveTicketEnvelope {
  return {
    schema: "escrow.v1.ResolveTicketEnvelope",
    ticket_cbor_hex: bytesToHex(signed.bytes),
    signature_hex: bytesToHex(
      signed.signature instanceof Uint8Array
        ? signed.signature
        : hexToBytes(String(signed.signature))
    ),
    pubkey_hex: pubkeyHex,
  };
}

/**
 * Parse + verify an envelope.
 * - Validates envelope schema tag
 * - Converts hex back to bytes
 * - Runs decodeAndVerifyTicket (sig + CBOR + zod + semantic checks)
 */
export function fromEnvelope(
  env: ResolveTicketEnvelope,
  opts: DecodeVerifyOptions = {}
) {
  if (env.schema !== "escrow.v1.ResolveTicketEnvelope") {
    return { ok: false, reason: "invalid_envelope_schema" } as const;
  }

  const bytes = hexToBytes(env.ticket_cbor_hex);
  const sigBytes = hexToBytes(env.signature_hex);
  const pubkeyBytes = hexToBytes(env.pubkey_hex);

  return decodeAndVerifyTicket(bytes, sigBytes, pubkeyBytes, opts);
}

// ------------- hex helpers (no external deps) -------------

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const hex = bytes[i].toString(16).padStart(2, "0");
    out += hex;
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error("hex string must have an even length");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = clean.slice(i * 2, i * 2 + 2);
    bytes[i] = parseInt(byte, 16);
  }
  return bytes;
}
