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
