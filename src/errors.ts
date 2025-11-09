/**
 * Typed error classes for tickets-lib.
 *
 * Purpose
 * - Provide stable, machine-readable error categories for callers.
 * - Keep stack traces and optional details for debugging without leaking secrets.
 *
 * Design
 * - All library errors extend TicketsLibError and carry a `code`.
 * - No IO. These errors are plain objects suitable for logs or JSON.
 *
 * Usage
 * try {
 *   // validate, encode, sign, verify
 * } catch (e) {
 *   if (isTicketsLibError(e)) {
 *     console.error(e.code, e.message, e.details);
 *   } else {
 *     throw e;
 *   }
 * }
 */

/** Narrow, explicit error codes to make switch statements safe. */
export type TicketsLibErrorCode =
  | "SCHEMA_INVALID"
  | "SIGNATURE_INVALID";

/** Options bag for constructing errors without guessy positional args. */
export type TicketsLibErrorOptions = {
  /** Nested cause from a lower level library. */
  cause?: unknown;
  /** Extra structured context safe for logs, never secrets. */
  details?: Record<string, unknown>;
};

/**
 * Base class for all tickets-lib errors.
 * Carries a string `code`, optional `details`, and optional `cause`.
 */
export abstract class TicketsLibError extends Error {
  readonly code: TicketsLibErrorCode;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(message: string, code: TicketsLibErrorCode, opts?: TicketsLibErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = opts?.details;
    // `cause` is supported by modern runtimes but we also store it for completeness
    // and toJSON emits a redacted view.
    // @ts-expect-error TS lib typing of Error.cause may vary by target
    this.cause = opts?.cause;
  }

  /**
   * JSON friendly representation for structured logs.
   * Omits stack by default to keep logs compact. Include it manually if needed.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Schema validation failed.
 * Typical `details` fields:
 * - issues: array of { path: string, message: string }
 */
export class SchemaError extends TicketsLibError {
  constructor(message = "ResolveTicket schema validation failed", opts?: TicketsLibErrorOptions) {
    super(message, "SCHEMA_INVALID", opts);
  }

  /**
   * Helper to turn a ZodError-like object into a SchemaError with summarized issues.
   * Accepts any shape that has an `issues` array of objects with `path` and `message`.
   */
  static fromValidationError(err: unknown): SchemaError {
    const details: Record<string, unknown> = {};
    const issues: Array<{ path: string; message: string }> = [];

    // Best effort extraction without hard typing on a specific validator
    if (err && typeof err === "object" && "issues" in err && Array.isArray((err as any).issues)) {
      for (const issue of (err as any).issues) {
        const path = Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path ?? "");
        issues.push({ path, message: String(issue.message ?? "invalid") });
      }
    }

    if (issues.length) {
      details.issues = issues;
    }

    return new SchemaError("ResolveTicket schema validation failed", {
      cause: err,
      details: Object.keys(details).length ? details : undefined
    });
  }
}

/**
 * Signature creation or verification failed.
 * Typical `details` fields:
 * - reason: short string like "invalid-length" or "verify-failed"
 */
export class SignatureError extends TicketsLibError {
  constructor(message = "ed25519 signature failure", opts?: TicketsLibErrorOptions) {
    super(message, "SIGNATURE_INVALID", opts);
  }

  static invalidLength(kind: "secret" | "publicKey" | "signature", got: number): SignatureError {
    return new SignatureError("ed25519 invalid key or signature length", {
      details: { kind, got }
    });
  }

  static verifyFailed(): SignatureError {
    return new SignatureError("ed25519 verification failed", {
      details: { reason: "verify-failed" }
    });
  }
}

/** Type guard to recognize library errors at catch sites. */
export function isTicketsLibError(e: unknown): e is TicketsLibError {
  return e instanceof TicketsLibError;
}
