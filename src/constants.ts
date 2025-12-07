/**
 * @module constants
 * @description Configuration constants and thresholds for ResolveTickets
 * 
 * Centralizes magic numbers and configuration values used across
 * the tickets library for consistency and maintainability.
 */

/**
 * Ticket timing constraints
 */

/** Maximum ticket lifetime in seconds (24 hours) */
export const MAX_TICKET_LIFETIME_SECONDS = 24 * 60 * 60;

/** Minimum ticket lifetime in seconds (1 minute) */
export const MIN_TICKET_LIFETIME_SECONDS = 60;

/** Recommended ticket lifetime for production (1 hour) */
export const RECOMMENDED_TICKET_LIFETIME_SECONDS = 60 * 60;

/**
 * Split basis points constraints
 */

/** Maximum basis points value (100% = 10000 bps) */
export const MAX_SPLIT_BPS = 10_000;

/** Minimum basis points for a valid SPLIT action */
export const MIN_SPLIT_BPS = 1;

/** Maximum basis points for a valid SPLIT action (99.99%) */
export const MAX_SPLIT_BPS_FOR_SPLIT = 9_999;

/**
 * Confidence score thresholds
 */

/** Minimum valid confidence score */
export const MIN_CONFIDENCE = 0.0;

/** Maximum valid confidence score */
export const MAX_CONFIDENCE = 1.0;

/** Recommended minimum confidence for automatic execution (70%) */
export const RECOMMENDED_MIN_CONFIDENCE = 0.7;

/** High confidence threshold indicating strong arbiter certainty (90%) */
export const HIGH_CONFIDENCE_THRESHOLD = 0.9;

/** Low confidence threshold that may require human review (50%) */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Nonce validation constraints
 */

/** Maximum allowed gap between sequential nonces to prevent exhaustion attacks */
export const MAX_NONCE_GAP = 100;

/** Initial nonce value for first ticket in a deal */
export const INITIAL_NONCE = 0;

/**
 * CID (Content Identifier) constraints
 */

/** Minimum CID string length for basic validation */
export const MIN_CID_LENGTH = 46; // CIDv0: "Qm" + 44 chars

/** Maximum CID string length for basic validation */
export const MAX_CID_LENGTH = 100;

/** CIDv0 prefix (base58btc multihash) */
export const CID_V0_PREFIX = "Qm";

/** CIDv1 base32 prefix */
export const CID_V1_PREFIX = "b";

/**
 * Deal ID constraints
 */

/** Minimum deal ID length */
export const MIN_DEAL_ID_LENGTH = 1;

/** Maximum deal ID length */
export const MAX_DEAL_ID_LENGTH = 128;

/**
 * Ticket schema version
 */

/** Current ticket schema version */
export const CURRENT_SCHEMA_VERSION = "escrow.v1.ResolveTicket" as const;

/**
 * Error messages
 */

export const ERROR_MESSAGES = {
  TICKET_EXPIRED: "Ticket has expired and cannot be processed",
  INVALID_NONCE_SEQUENCE: "Nonce must be strictly increasing",
  NONCE_GAP_TOO_LARGE: "Nonce gap exceeds maximum allowed value",
  INVALID_SPLIT_BPS: "Split basis points must be between 1 and 9999 for SPLIT action",
  SPLIT_BPS_MUST_BE_ZERO: "Split basis points must be 0 for RELEASE or REFUND actions",
  LOW_CONFIDENCE: "Ticket confidence is below recommended threshold",
  INVALID_CONFIDENCE_RANGE: "Confidence must be between 0 and 1",
  TICKET_LIFETIME_TOO_LONG: "Ticket lifetime exceeds maximum allowed duration",
  TICKET_LIFETIME_TOO_SHORT: "Ticket lifetime is less than minimum required duration",
  INVALID_CID_FORMAT: "Invalid CID format",
  INVALID_DEAL_ID: "Deal ID must be a non-empty string",
} as const;

/**
 * Action types (for reference and type safety)
 */

export const RESOLVE_ACTIONS = {
  RELEASE: "RELEASE",
  REFUND: "REFUND",
  SPLIT: "SPLIT",
} as const;

/**
 * Validation presets
 */

/** Strict validation preset - for production use */
export const STRICT_VALIDATION = {
  minConfidence: RECOMMENDED_MIN_CONFIDENCE,
  maxNonceGap: MAX_NONCE_GAP,
  maxLifetime: MAX_TICKET_LIFETIME_SECONDS,
  minLifetime: MIN_TICKET_LIFETIME_SECONDS,
} as const;

/** Permissive validation preset - for testing/development */
export const PERMISSIVE_VALIDATION = {
  minConfidence: MIN_CONFIDENCE,
  maxNonceGap: MAX_NONCE_GAP * 10,
  maxLifetime: MAX_TICKET_LIFETIME_SECONDS * 7, // 1 week
  minLifetime: 1, // 1 second
} as const;
