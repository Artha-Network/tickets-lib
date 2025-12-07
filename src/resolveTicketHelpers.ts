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
 * Signed ticket bundle (what most callers actu*
