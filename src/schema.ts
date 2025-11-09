/**
 * ResolveTicket schema and types.
 *
 * A ResolveTicket is the signed, immutable instruction produced by an arbiter
 * that tells the escrow program how to finalize a disputed deal.
 *
 * Invariants:
 * - `schema` anchors the contract shape and version. Changing fields requires a new literal.
 * - `deal_id` is an opaque identifier chosen by the calling system.
 * - `action` determines the payout behavior.
 * - `split_bps` expresses the seller share in basis points when action is SPLIT.
 * - `rationale_cid` points to an immutable explanation and evidence bundle.
 * - `confidence` is a score in [0, 1] emitted by the arbiter for observability.
 * - `nonce` is a per deal monotonic counter to prevent replay.
 * - `expires_at` is a hard time boundary (unix seconds) after which verifiers must reject.
 *
 * This file defines only pure data definitions and validation. No IO, no signing.
 */

import { z } from "zod";

/**
 * Allowed finalization actions.
 *
 * RELEASE: full payout to seller.
 * REFUND: full refund to buyer.
 * SPLIT: proportional split according to `split_bps`.
 */
export const ResolveAction = z.enum(["RELEASE", "REFUND", "SPLIT"]);
export type ResolveAction = z.infer<typeof ResolveAction>;

/**
 * Version anchor for this ticket shape.
 * Bump to "escrow.v2.ResolveTicket" if the schema changes in any breaking or encoding visible way.
 */
export const RESOLVE_TICKET_VERSION = "escrow.v1.ResolveTicket" as const;

/**
 * ResolveTicketSchema
 *
 * Notes on fields:
 * - deal_id: carry whatever identifier your escrow program or backend uses to locate the deal.
 * - split_bps: basis points for seller when action is SPLIT. For RELEASE or REFUND, keep at 0.
 * - rationale_cid: content identifier for the arbiter rationale and any referenced evidence.
 * - nonce: verifiers should enforce strictly increasing values per (deal_id).
 * - expires_at: verifiers should reject tickets with time now greater than this value.
 */
export const ResolveTicketSchema = z
  .object({
    schema: z.literal(RESOLVE_TICKET_VERSION),

    deal_id: z
      .string()
      .min(1, "deal_id must be a non empty string"),

    action: ResolveAction,

    split_bps: z
      .number()
      .int()
      .min(0, "split_bps cannot be negative")
      .max(10_000, "split_bps cannot exceed 10000"),

    rationale_cid: z
      .string()
      .min(3, "rationale_cid must be a non empty CID like bafy..."),

    confidence: z
      .number()
      .min(0, "confidence must be >= 0")
      .max(1, "confidence must be <= 1"),

    nonce: z
      .number()
      .int()
      .nonnegative("nonce must be a non negative integer"),

    expires_at: z
      .number()
      .int()
      .positive("expires_at must be a positive unix timestamp (seconds)")
  })
  // Enforce consistency between action and split_bps without guessing business logic beyond basics.
  .superRefine((val, ctx) => {
    if (val.action === "SPLIT") {
      if (val.split_bps <= 0 || val.split_bps >= 10_000) {
        ctx.addIssue({
          path: ["split_bps"],
          code: z.ZodIssueCode.custom,
          message: "For SPLIT, split_bps must be between 1 and 9999"
        });
      }
    } else {
      if (val.split_bps !== 0) {
        ctx.addIssue({
          path: ["split_bps"],
          code: z.ZodIssueCode.custom,
          message: "For RELEASE or REFUND, split_bps must be 0"
        });
      }
    }
  });

/**
 * TypeScript type inferred from the schema. Use this for strong typing across the codebase.
 */
export type ResolveTicket = z.infer<typeof ResolveTicketSchema>;

/**
 * Convenience validator.
 * Throws a ZodError on failure and returns a typed ResolveTicket on success.
 *
 * Prefer this over calling `schema.parse` throughout your code to keep imports ergonomic.
 */
export function assertResolveTicket(input: unknown): ResolveTicket {
  return ResolveTicketSchema.parse(input);
}

/**
 * Narrower TypeScript guard for callers who prefer boolean checks over exceptions.
 * When it returns true, `input` is narrowed to ResolveTicket at the call site.
 */
export function isResolveTicket(input: unknown): input is ResolveTicket {
  const result = ResolveTicketSchema.safeParse(input);
  return result.success;
}

/**
 * Exported under the conventional `schema` name for ergonomic imports:
 *   import { schema } from "@trust-escrow/tickets-lib";
 */
export const schema = ResolveTicketSchema;
