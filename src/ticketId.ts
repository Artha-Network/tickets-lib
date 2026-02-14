import { createHash } from 'crypto';
import { encodeCbor } from './cbor';
import { type ResolveTicket } from './schema';

/**
 * Generates a deterministic, unique identifier for a ticket.
 * Uses SHA-256 hash of the canonical CBOR encoding.
 */
export function getTicketId(ticket: ResolveTicket): string {
  // 1. Get canonical bytes (ensures key order doesn't matter)
  const cborBytes = encodeCbor(ticket);
  
  // 2. Hash it
  const hash = createHash('sha256').update(cborBytes).digest('hex');
  
  return `ticket:v1:${hash}`;
}

/**
 * Verify if a given ID matches a ticket's content.
 */
export function verifyTicketId(ticket: ResolveTicket, id: string): boolean {
  return getTicketId(ticket) === id;
}
