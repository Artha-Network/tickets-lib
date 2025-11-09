/**
 * Centralized type exports.
 *
 * Purpose
 * - Provide a single import path for the core domain types used by tickets-lib.
 * - Keep application code decoupled from the internal file layout
 *   (apps import from "@trust-escrow/tickets-lib" without reaching into ./schema).
 *
 * Design notes
 * - Types here are re-exported from the schema to ensure one source of truth.
 * - Additive type aliases should be declared here if they are purely semantic
 *   (for example, branded hex strings). Avoid runtime-bearing constructs.
 *
 * Usage
 *   import type { ResolveTicket } from "@trust-escrow/tickets-lib";
 */

export type { ResolveTicket } from "./schema";
export type { ResolveAction } from "./schema";

/**
 * If you need semantic clarity in app code, consider local aliases like:
 *
 *   type DealId = string;
 *
 * We intentionally do not brand these here to keep the public API minimal
 * and avoid forcing downstream projects to carry opaque branding utilities.
 */
