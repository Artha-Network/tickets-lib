// src/resolveTicketMultisig.ts
//
// Helpers for multi-signature ResolveTickets.
// Useful when you want buyer, seller, and/or moderator to all sign
// the *same* ResolveTicket before acting on it.

import { encodeCbor, verify } from ".";
import type { ResolveTicket } from "./resolveTicketHelpers";

export type ParticipantRole =
  | "BUYER"
  | "SELLER"
  | "MODERATOR"
  | "ORACLE";

export interface ParticipantSignature {
  role: ParticipantRole;
  /**
   * Public key of signer. Type is intentionally loose so you can pass
   * Uint8Array or string (hex/base58/etc) depending on your ed25519 impl.
   */
  pubkey: Uint8Array | string;
  signature: Uint8Array | string;
}

export interface MultiSigTicket {
  ticket: ResolveTicket;
  signatures: ParticipantSignature[];
}

/**
 * Create a MultiSigTicket wrapper with no signatures yet.
 */
export function createMultiSigTicket(
  ticket: ResolveTicket
): MultiSigTicket {
  return { ticket, signatures: [] };
}

/**
 * Append a participant signature after verifying it matches the ticket.
 * Throws if the signature is invalid.
 *
 * If a signature from the same role+pubkey already exists, it is replaced.
 */
export function addParticipantSignature(
  multi: MultiSigTicket,
  sig: ParticipantSignature
): MultiSigTicket {
  const bytes = encodeCbor(multi.ticket);

  const ok = verify(bytes, sig.signature, sig.pubkey);
  if (!ok) {
    throw new Error("invalid_signature_for_ticket");
  }

  const nextSignatures = multi.signatures.filter(
    (s) => !(s.role === sig.role && keyEquals(s.pubkey, sig.pubkey))
  );
  nextSignatures.push(sig);

  return {
    ticket: multi.ticket,
    signatures: nextSignatures,
  };
}

/**
 * Returns true if we have at least one signature for each required role.
 * Assumes signatures were checked when added.
 */
export function isThresholdMet(
  multi: MultiSigTicket,
  requiredRoles: ParticipantRole[]
): boolean {
  return requiredRoles.every((role) =>
    multi.signatures.some((s) => s.role === role)
  );
}

/**
 * Convenience: get all pubkeys that have signed for a given role.
 */
export function getSignersForRole(
  multi: MultiSigTicket,
  role: ParticipantRole
): Array<Uint8Array | string> {
  return multi.signatures
    .filter((s) => s.role === role)
    .map((s) => s.pubkey);
}

/**
 * Compare keys. If both are strings, compare string-wise.
 * If both are Uint8Array, compare bytes.
 * Otherwise just fall back to strict equality.
 */
function keyEquals(
  a: Uint8Array | string,
  b: Uint8Array | string
): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  }
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a === (b as any);
}
