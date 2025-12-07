/**
 * @module validation
 * @description Business logic validation for ResolveTickets
 * 
 * Provides comprehensive validation functions that check business rules
 * and constraints beyond basic schema validation.
 */

import type { ResolveTicket } from "./schema";
import {
  MAX_SPLIT_BPS,
  MIN_SPLIT_BPS_FOR_SPLIT,
  MAX_SPLIT_BPS_FOR_SPLIT,
  MIN_CID_LENGTH,
  MAX_CID_LENGTH,
  CID_V0_PREFIX,
  CID_V1_PREFIX,
  MIN_DEAL_ID_LENGTH,
  MAX_DEAL_ID_LENGTH,
  ERROR_MESSAGES,
  RECOMMENDED_MIN_CONFIDENCE,
} from "./constants";

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Perform comprehensive ticket validation including business rules
 * 
 * Checks beyond schema validation:
 * - Action/split_bps consistency
 * - Timing constraints
 * - CID format
 * - Confidence thresholds
 * 
 * @param ticket - The ResolveTicket to validate
 * @param options - Optional validation configuration
 * @returns Comprehensive validation result
 * 
 * @example
 * ```typescript
 * const result = validateTicketIntegrity(ticket);
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn("Validation warnings:", result.warnings);
 * }
 * ```
 */
export function validateTicketIntegrity(
  ticket: ResolveTicket,
  options: {
    currentTime?: number;
    minConfidence?: number;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { currentTime = Math.floor(Date.now() / 1000), minConfidence = RECOMMENDED_MIN_CONFIDENCE } = options;

  // Validate split_bps consistency with action
  const splitResult = validateSplitConsistency(ticket);
  if (!splitResult.valid) {
    errors.push(splitResult.error!);
  }

  // Validate expiry timing
  if (ticket.expires_at <= currentTime) {
    errors.push(ERROR_MESSAGES.TICKET_EXPIRED);
  }

  // Validate CID format
  if (!validateCIDFormat(ticket.rationale_cid)) {
    errors.push(`${ERROR_MESSAGES.INVALID_CID_FORMAT}: ${ticket.rationale_cid}`);
  }

  // Validate deal_id
  if (ticket.deal_id.length < MIN_DEAL_ID_LENGTH || ticket.deal_id.length > MAX_DEAL_ID_LENGTH) {
    errors.push(`Deal ID length must be between ${MIN_DEAL_ID_LENGTH} and ${MAX_DEAL_ID_LENGTH}`);
  }

  // Check confidence threshold (warning, not error)
  if (ticket.confidence < minConfidence) {
    warnings.push(
      `Confidence ${ticket.confidence} is below recommended minimum of ${minConfidence}. Consider human review.`
    );
  }

  // Check for edge case split values
  if (ticket.action === "SPLIT") {
    if (ticket.split_bps === MIN_SPLIT_BPS) {
      warnings.push("Split is 0.01% to seller - almost a full refund. Verify intent.");
    }
    if (ticket.split_bps === MAX_SPLIT_BPS_FOR_SPLIT) {
      warnings.push("Split is 99.99% to seller - almost a full release. Verify intent.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate consistency between action and split_bps
 * 
 * Business rules:
 * - RELEASE/REFUND must have split_bps = 0
 * - SPLIT must have split_bps between 1 and 9999
 * 
 * @param ticket - The ResolveTicket to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const result = validateSplitConsistency(ticket);
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateSplitConsistency(ticket: ResolveTicket): {
  valid: boolean;
  error?: string;
} {
  if (ticket.action === "SPLIT") {
    if (ticket.split_bps < MIN_SPLIT_BPS || ticket.split_bps > MAX_SPLIT_BPS_FOR_SPLIT) {
      return {
        valid: false,
        error: ERROR_MESSAGES.INVALID_SPLIT_BPS,
      };
    }
  } else {
    // RELEASE or REFUND
    if (ticket.split_bps !== 0) {
      return {
        valid: false,
        error: ERROR_MESSAGES.SPLIT_BPS_MUST_BE_ZERO,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate CID (Content Identifier) format
 * 
 * Performs basic format validation for CIDv0 and CIDv1 identifiers.
 * 
 * CIDv0: Qm + 44 base58 characters
 * CIDv1: b + base32 characters
 * 
 * @param cid - The CID string to validate
 * @returns true if format appears valid
 * 
 * @example
 * ```typescript
 * if (!validateCIDFormat("QmInvalidCID")) {
 *   throw new Error("Invalid CID format");
 * }
 * ```
 */
export function validateCIDFormat(cid: string): boolean {
  if (!cid || typeof cid !== "string") {
    return false;
  }

  if (cid.length < MIN_CID_LENGTH || cid.length > MAX_CID_LENGTH) {
    return false;
  }

  // CIDv0: starts with "Qm" and is 46 characters
  if (cid.startsWith(CID_V0_PREFIX)) {
    return cid.length === 46 && /^[1-9A-HJ-NP-Za-km-z]{46}$/.test(cid);
  }

  // CIDv1: starts with "b" and contains base32 characters
  if (cid.startsWith(CID_V1_PREFIX)) {
    return /^b[a-z2-7]+$/.test(cid);
  }

  return false;
}

/**
 * Validate that a ticket is safe to execute automatically
 * 
 * Checks multiple criteria for safe automatic execution:
 * - Not expired
 * - Meets confidence threshold
 * - Valid action/split_bps
 * - No critical warnings
 * 
 * @param ticket - The ResolveTicket to validate
 * @param options - Validation options
 * @returns true if safe for automatic execution
 * 
 * @example
 * ```typescript
 * if (isSafeForAutomaticExecution(ticket, { minConfidence: 0.8 })) {
 *   await executeTicket(ticket);
 * } else {
 *   await escalateToHumanReview(ticket);
 * }
 * ```
 */
export function isSafeForAutomaticExecution(
  ticket: ResolveTicket,
  options: {
    currentTime?: number;
    minConfidence?: number;
  } = {}
): boolean {
  const { minConfidence = 0.8 } = options;
  
  const result = validateTicketIntegrity(ticket, options);
  
  // Must have no errors
  if (!result.valid) {
    return false;
  }

  // Must meet confidence threshold
  if (ticket.confidence < minConfidence) {
    return false;
  }

  // Avoid edge case splits (too close to 0% or 100%)
  if (ticket.action === "SPLIT") {
    if (ticket.split_bps < 100 || ticket.split_bps > 9900) {
      return false; // Splits less than 1% or greater than 99% should be reviewed
    }
  }

  return true;
}

/**
 * Validate deal ID format
 * 
 * Checks that deal_id meets basic format requirements.
 * 
 * @param dealId - The deal ID to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const result = validateDealId("deal-abc-123");
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateDealId(dealId: string): {
  valid: boolean;
  error?: string;
} {
  if (!dealId || typeof dealId !== "string") {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_DEAL_ID,
    };
  }

  if (dealId.length < MIN_DEAL_ID_LENGTH) {
    return {
      valid: false,
      error: `Deal ID too short: minimum length is ${MIN_DEAL_ID_LENGTH}`,
    };
  }

  if (dealId.length > MAX_DEAL_ID_LENGTH) {
    return {
      valid: false,
      error: `Deal ID too long: maximum length is ${MAX_DEAL_ID_LENGTH}`,
    };
  }

  // Check for only printable ASCII characters
  if (!/^[\x20-\x7E]+$/.test(dealId)) {
    return {
      valid: false,
      error: "Deal ID contains invalid characters",
    };
  }

  return { valid: true };
}

/**
 * Check if a ticket requires human review
 * 
 * Determines if a ticket should be escalated based on:
 * - Low confidence score
 * - Edge case split values
 * - Validation warnings
 * 
 * @param ticket - The ResolveTicket to check
 * @param options - Check options
 * @returns true if human review is recommended
 * 
 * @example
 * ```typescript
 * if (requiresHumanReview(ticket)) {
 *   await notifyHumanReviewer(ticket);
 * }
 * ```
 */
export function requiresHumanReview(
  ticket: ResolveTicket,
  options: {
    minConfidence?: number;
  } = {}
): boolean {
  const { minConfidence = RECOMMENDED_MIN_CONFIDENCE } = options;

  // Low confidence requires review
  if (ticket.confidence < minConfidence) {
    return true;
  }

  // Edge case splits require review
  if (ticket.action === "SPLIT") {
    if (ticket.split_bps < 100 || ticket.split_bps > 9900) {
      return true;
    }
  }

  // Check for validation warnings
  const result = validateTicketIntegrity(ticket, { minConfidence });
  if (result.warnings.length > 0) {
    return true;
  }

  return false;
}
