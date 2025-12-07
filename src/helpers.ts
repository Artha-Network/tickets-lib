/**
 * @module helpers
 * @description Utility functions for working with ResolveTickets
 * 
 * Provides helper functions for common ticket operations including:
 * - Expiry validation
 * - Nonce sequence validation
 * - Split amount calculations
 * - Ticket formatting and display
 * - Ticket comparison
 */

import type { ResolveTicket } from "./schema";

/**
 * Check if a ticket has expired based on its expires_at timestamp
 * 
 * @param ticket - The ResolveTicket to check
 * @param currentTime - Optional current time in seconds (defaults to Date.now())
 * @returns true if the ticket has expired
 * 
 * @example
 * ```typescript
 * const ticket = { expires_at: 1700000000, ... };
 * if (isTicketExpired(ticket)) {
 *   console.log("Ticket has expired");
 * }
 * ```
 */
export function isTicketExpired(
  ticket: ResolveTicket,
  currentTime?: number
): boolean {
  const now = currentTime ?? Math.floor(Date.now() / 1000);
  return now > ticket.expires_at;
}

/**
 * Validate that a ticket's nonce follows the expected sequence
 * 
 * Ensures nonces are strictly increasing to prevent replay attacks.
 * 
 * @param ticket - The ResolveTicket to validate
 * @param lastNonce - The last known nonce for this deal
 * @returns Validation result with valid flag and optional error message
 * 
 * @example
 * ```typescript
 * const result = validateNonceSequence(ticket, 5);
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateNonceSequence(
  ticket: ResolveTicket,
  lastNonce: number
): { valid: boolean; error?: string } {
  if (ticket.nonce <= lastNonce) {
    return {
      valid: false,
      error: `Invalid nonce: ${ticket.nonce} must be greater than last nonce ${lastNonce}`
    };
  }

  // Prevent suspiciously large gaps (potential nonce exhaustion attack)
  const MAX_NONCE_GAP = 100;
  const gap = ticket.nonce - lastNonce;
  if (gap > MAX_NONCE_GAP) {
    return {
      valid: false,
      error: `Nonce gap too large: ${gap} exceeds maximum allowed gap of ${MAX_NONCE_GAP}`
    };
  }

  return { valid: true };
}

/**
 * Calculate the exact split amounts for buyer and seller based on basis points
 * 
 * @param totalAmount - Total escrow amount (in smallest units, e.g., lamports or USDC base units)
 * @param splitBps - Basis points for seller (0-10000, where 10000 = 100%)
 * @returns Object containing sellerAmount and buyerAmount
 * 
 * @example
 * ```typescript
 * const amounts = calculateSplitAmounts(1000000, 7500); // 75% to seller
 * console.log(amounts); // { sellerAmount: 750000, buyerAmount: 250000 }
 * ```
 */
export function calculateSplitAmounts(
  totalAmount: number,
  splitBps: number
): {
  sellerAmount: number;
  buyerAmount: number;
} {
  if (splitBps < 0 || splitBps > 10_000) {
    throw new Error(`Invalid split_bps: ${splitBps}. Must be between 0 and 10000`);
  }

  // Calculate seller amount: (total * bps) / 10000
  const sellerAmount = Math.floor((totalAmount * splitBps) / 10_000);
  const buyerAmount = totalAmount - sellerAmount;

  return { sellerAmount, buyerAmount };
}

/**
 * Format a ResolveTicket into a human-readable summary string
 * 
 * @param ticket - The ResolveTicket to format
 * @returns Multi-line formatted string
 * 
 * @example
 * ```typescript
 * const summary = formatTicketForDisplay(ticket);
 * console.log(summary);
 * // Output:
 * // Deal: abc123
 * // Action: RELEASE
 * // Confidence: 92%
 * // Expires: 2025-12-07 10:30 UTC
 * ```
 */
export function formatTicketForDisplay(ticket: ResolveTicket): string {
  const expiresDate = new Date(ticket.expires_at * 1000).toISOString();
  const confidencePercent = (ticket.confidence * 100).toFixed(1);

  let actionDetails = ticket.action;
  if (ticket.action === "SPLIT") {
    const sellerPercent = (ticket.split_bps / 100).toFixed(1);
    const buyerPercent = (100 - ticket.split_bps / 100).toFixed(1);
    actionDetails = `SPLIT (${sellerPercent}% seller, ${buyerPercent}% buyer)`;
  }

  return `Deal: ${ticket.deal_id}
Action: ${actionDetails}
Confidence: ${confidencePercent}%
Nonce: ${ticket.nonce}
Rationale: ${ticket.rationale_cid}
Expires: ${expiresDate}`;
}

/**
 * Validate ticket timing constraints
 * 
 * Checks if the ticket's expiry time is reasonable and not already expired.
 * 
 * @param ticket - The ResolveTicket to validate
 * @param currentTime - Optional current time in seconds (defaults to Date.now())
 * @returns Validation result with valid flag and optional reason
 * 
 * @example
 * ```typescript
 * const result = isTicketTimingValid(ticket);
 * if (!result.valid) {
 *   console.error(`Invalid timing: ${result.reason}`);
 * }
 * ```
 */
export function isTicketTimingValid(
  ticket: ResolveTicket,
  currentTime?: number
): { valid: boolean; reason?: string } {
  const now = currentTime ?? Math.floor(Date.now() / 1000);

  // Check if already expired
  if (ticket.expires_at <= now) {
    return {
      valid: false,
      reason: `Ticket expired at ${new Date(ticket.expires_at * 1000).toISOString()}`
    };
  }

  // Check if expiry is too far in the future (max 24 hours)
  const MAX_LIFETIME_SECONDS = 24 * 60 * 60;
  const lifetime = ticket.expires_at - now;
  if (lifetime > MAX_LIFETIME_SECONDS) {
    return {
      valid: false,
      reason: `Ticket lifetime ${lifetime}s exceeds maximum of ${MAX_LIFETIME_SECONDS}s (24 hours)`
    };
  }

  // Check if expiry is too soon (min 60 seconds)
  const MIN_LIFETIME_SECONDS = 60;
  if (lifetime < MIN_LIFETIME_SECONDS) {
    return {
      valid: false,
      reason: `Ticket lifetime ${lifetime}s is less than minimum of ${MIN_LIFETIME_SECONDS}s`
    };
  }

  return { valid: true };
}

/**
 * Compare two tickets for equality (excluding signature)
 * 
 * Useful for detecting duplicate tickets or verifying ticket reconstruction.
 * 
 * @param t1 - First ResolveTicket
 * @param t2 - Second ResolveTicket
 * @returns true if all fields match
 * 
 * @example
 * ```typescript
 * if (areTicketsEqual(ticket1, ticket2)) {
 *   console.log("Tickets are identical");
 * }
 * ```
 */
export function areTicketsEqual(
  t1: ResolveTicket,
  t2: ResolveTicket
): boolean {
  return (
    t1.schema === t2.schema &&
    t1.deal_id === t2.deal_id &&
    t1.action === t2.action &&
    t1.split_bps === t2.split_bps &&
    t1.rationale_cid === t2.rationale_cid &&
    t1.confidence === t2.confidence &&
    t1.nonce === t2.nonce &&
    t1.expires_at === t2.expires_at
  );
}

/**
 * Get time remaining until ticket expiry
 * 
 * @param ticket - The ResolveTicket to check
 * @param currentTime - Optional current time in seconds (defaults to Date.now())
 * @returns Seconds remaining until expiry (negative if expired)
 * 
 * @example
 * ```typescript
 * const remaining = getTimeUntilExpiry(ticket);
 * console.log(`Ticket expires in ${remaining} seconds`);
 * ```
 */
export function getTimeUntilExpiry(
  ticket: ResolveTicket,
  currentTime?: number
): number {
  const now = currentTime ?? Math.floor(Date.now() / 1000);
  return ticket.expires_at - now;
}

/**
 * Check if a ticket's confidence meets a minimum threshold
 * 
 * @param ticket - The ResolveTicket to check
 * @param threshold - Minimum confidence required (0-1)
 * @returns true if confidence meets or exceeds threshold
 * 
 * @example
 * ```typescript
 * if (!meetsConfidenceThreshold(ticket, 0.7)) {
 *   console.warn("Low confidence ticket, consider human review");
 * }
 * ```
 */
export function meetsConfidenceThreshold(
  ticket: ResolveTicket,
  threshold: number
): boolean {
  if (threshold < 0 || threshold > 1) {
    throw new Error(`Invalid threshold: ${threshold}. Must be between 0 and 1`);
  }
  return ticket.confidence >= threshold;
}
