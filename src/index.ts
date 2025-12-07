/**
 * Public API for @trust-escrow/tickets-lib
 *
 * This module re-exports the stable surface area of the library so consumers
 * can import from a single path:
 *
 *   import {
 *     schema,
 *     encodeCbor, decodeCbor,
 *     sign, verify, derivePublicKey,
 *     toHex, hexToBytes, bytesToHex,
 *     RESOLVE_TICKET_VERSION, ResolveAction,
 *     SchemaError, SignatureError, isTicketsLibError,
 *     type ResolveTicket
 *   } from "@trust-escrow/tickets-lib";
 *
 * Design notes
 * - Only pure helpers are exported. No IO, no globals, no side effects.
 * - Schema and types come from ./schema to ensure a single source of truth.
 * - Errors have concise types so callers can branch on categories.
 */

// Schema and version anchors
export {
  ResolveTicketSchema as schema,
  RESOLVE_TICKET_VERSION,
  ResolveAction
} from "./schema";
export type { ResolveTicket } from "./schema";

// Canonical CBOR helpers
export { encodeCbor, decodeCbor, isDeterministicEncode } from "./cbor";

// ed25519 helpers
export { sign, verify, derivePublicKey, toHex } from "./ed25519";

// Byte utilities (hex helpers)
export { hexToBytes, bytesToHex } from "./utils/bytes";

// Error types and guards
export {
  TicketsLibError,
  SchemaError,
  SignatureError,
  isTicketsLibError
} from "./errors";
export type { TicketsLibErrorCode } from "./errors";

// Helper functions (Sprint 3)
export {
  isTicketExpired,
  validateNonceSequence,
  calculateSplitAmounts,
  formatTicketForDisplay,
  isTicketTimingValid,
  areTicketsEqual,
  getTimeUntilExpiry,
  meetsConfidenceThreshold,
} from "./helpers";

// Constants (Sprint 3)
export {
  MAX_TICKET_LIFETIME_SECONDS,
  MIN_TICKET_LIFETIME_SECONDS,
  RECOMMENDED_TICKET_LIFETIME_SECONDS,
  MAX_SPLIT_BPS,
  MIN_SPLIT_BPS,
  MAX_SPLIT_BPS_FOR_SPLIT,
  MIN_CONFIDENCE,
  MAX_CONFIDENCE,
  RECOMMENDED_MIN_CONFIDENCE,
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_NONCE_GAP,
  INITIAL_NONCE,
  MIN_CID_LENGTH,
  MAX_CID_LENGTH,
  CID_V0_PREFIX,
  CID_V1_PREFIX,
  MIN_DEAL_ID_LENGTH,
  MAX_DEAL_ID_LENGTH,
  CURRENT_SCHEMA_VERSION,
  ERROR_MESSAGES,
  RESOLVE_ACTIONS,
  STRICT_VALIDATION,
  PERMISSIVE_VALIDATION,
} from "./constants";

// Validation functions (Sprint 3)
export {
  validateTicketIntegrity,
  validateSplitConsistency,
  validateCIDFormat,
  isSafeForAutomaticExecution,
  validateDealId,
  requiresHumanReview,
} from "./validation";
export type { ValidationResult } from "./validation";
