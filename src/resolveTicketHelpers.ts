// src/resolveTicketHelpers.ts
//
// High-level helpers for working with ResolveTicket.
//
// This builds on the low-level primitives exported by the library:
//   - schema          (zod schema)
//   - encodeCbor      (canonical CBOR)
//   - decodeCbor
//   - sign / verify   (ed25519)
//
// The goal is to make it easy for apps to:
//   - construct tickets with safe defaults
//   - sign & encode in one step
//   - decode, verify, and validate in one step

import { schema, encodeCbor, decodeCbor, sign, verify } from ".";
import type { z } from "zod";

// Infer the canonical ticket type from the zod schema
export type ResolveTicket = z.infer<typeof schema>;

/**
 * Input for creating a ResolveTicket.
 * We fill in schema, nonce and expires_at for you.
 */
export interface CreateResolveTicketInput {
  deal_id: string;
  action: "RELEASE" | "REFUND" | "SPLIT";

  /** How much to give to the seller in basis points (0–10_000). */
  split_bps?: number;

  /** IPFS / storage CID pointing at human-readable rationale. */
  rationale_cid: string;

  /** Confidence score 0–1. Default: 0.9. */
  confidence?: number;

  /**
   * Optional explicit nonce (e.g., from a sequence).
   * If omitted, we use current unix timestamp.
   */
  nonce?: number;

  /**
   * Absolute expiry time in unix seconds. If provided, wins.
   * If omitted, we use (now + expires_in_seconds).
   */
  expires_at?: number;

  /**
   * Relative expiry in seconds from "now" if expires_at not set.
   * Default: 1 hour.
   */
  expires_in_seconds?: number;

  /** Optional override for "now" in seconds (for testing). */
  now_seconds?: number;
}

/**
 * Convenience builder that applies safe defaults and validates
 * against the canonical zod schema.
 */
export function createResolveTicket(
  input: CreateResolveTicketInput
): ResolveTicket {
  const nowSeconds =
    input.now_seconds ?? Math.floor(Date.now() / 1000);

  const expiresAt =
    input.expires_at ??
    nowSeconds + (input.expires_in_seconds ?? 60 * 60); // 1h default

  const ticket = schema.parse({
    schema: "escrow.v1.ResolveTicket",
    deal_id: input.deal_id,
    action: input.action,
    split_bps: input.split_bps ?? 0,
    rationale_cid: input.rationale_cid,
    confidence: input.confidence ?? 0.9,
    nonce: input.nonce ?? nowSeconds,
    expires_at: expiresAt,
  });

  return ticket;
}

/**
 * Returns true if the ticket has expired.
 */
export function isTicketExpired(
  ticket: ResolveTicket,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  return ticket.expires_at <= nowSeconds;
}

/**
 * Signed ticket bundle (what most callers actually need).
 */
export interface SignedTicket {
  ticket: ResolveTicket;
  bytes: Uint8Array;
  signature: Uint8Array;
}

/**
 * One-shot helper:
 *   ResolveTicket -> canonical CBOR bytes -> ed25519 signature.
 *
 * `secretKey` type is left generic (string/Uint8Array) so you can
 * keep your existing sign() implementation unchanged.
 */
export function encodeAndSignTicket(
  ticket: ResolveTicket,
  secretKey: Uint8Array | string
): SignedTicket {
  const bytes = encodeCbor(ticket);
  const signature = sign(bytes, secretKey);
  return { ticket, bytes, signature };
}

/**
 * Options for decode + verify helper.
 */
export interface DecodeVerifyOptions {
  /** Optional: enforce that ticket.deal_id matches this value. */
  expectedDealId?: string;

  /** Optional: enforce a specific action. */
  expectedAction?: ResolveTicket["action"];

  /**
   * "Now" in unix seconds for expiry check. Default: current time.
   */
  nowSeconds?: number;

  /**
   * Allow tickets that expired <= maxSkewSeconds ago.
   * Useful to tolerate small clock drift.
   */
  maxSkewSeconds?: number;
}

/**
 * Result of decode + verify helper.
 */
export interface DecodeVerifyResult {
  ok: boolean;
  ticket?: ResolveTicket;
  reason?: string;
}

/**
 * One-shot helper:
 *
 *   bytes + signature + pubkey
 *     -> verify ed25519
 *     -> decode CBOR
 *     -> validate with zod schema
 *     -> optional expiry / deal_id / action checks
 */
export function decodeAndVerifyTicket(
  bytes: Uint8Array,
  signature: Uint8Array | string,
  pubkey: Uint8Array | string,
  opts: DecodeVerifyOptions = {}
): DecodeVerifyResult {
  const nowSeconds =
    opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxSkew = opts.maxSkewSeconds ?? 0;

  // 1) Crypto: signature
  const sigOk = verify(bytes, signature, pubkey);
  if (!sigOk) {
    return { ok: false, reason: "invalid_signature" };
  }

  // 2) Decode CBOR
  let raw: unknown;
  try {
    raw = decodeCbor(bytes);
  } catch (err) {
    return { ok: false, reason: "invalid_cbor" };
  }

  // 3) Validate against schema
  let ticket: ResolveTicket;
  try {
    ticket = schema.parse(raw);
  } catch (err) {
    return { ok: false, reason: "schema_validation_failed" };
  }

  // 4) Optional semantic checks
  if (
    opts.expectedDealId &&
    ticket.deal_id !== opts.expectedDealId
  ) {
    return { ok: false, reason: "mismatched_deal_id" };
  }

  if (
    opts.expectedAction &&
    ticket.action !== opts.expectedAction
  ) {
    return { ok: false, reason: "mismatched_action" };
  }

  const expired =
    ticket.expires_at + maxSkew < nowSeconds;
  if (expired) {
    return { ok: false, reason: "ticket_expired" };
  }

  return { ok: true, ticket };
}
