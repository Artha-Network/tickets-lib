import { type ResolveTicket } from './schema';
import { getTicketId } from './ticketId';

type TicketId = string;

export class ReplayGuard {
  // Stores seen Ticket IDs and their expiration time
  private seen = new Map<TicketId, number>();

  /**
   * Checks if a ticket is valid and hasn't been seen before.
   * Returns TRUE if accepted, FALSE if replay or expired.
   */
  accept(ticket: ResolveTicket): boolean {
    const now = Math.floor(Date.now() / 1000);

    // 1. Check strict expiration
    if (ticket.expires_at < now) {
      return false; // Expired
    }

    // 2. Check if already seen
    const id = getTicketId(ticket);
    if (this.seen.has(id)) {
      return false; // Replay detected
    }

    // 3. Mark as seen
    this.seen.set(id, ticket.expires_at);
    
    // 4. Cleanup old entries (lazy garbage collection)
    this.prune(now);
    
    return true;
  }

  /**
   * Remove expired tickets from memory to prevent leaks
   */
  private prune(now: number) {
    // Only prune occasionally to save perf, or on every Nth call
    if (this.seen.size > 1000) { 
      for (const [id, expiry] of this.seen) {
        if (expiry < now) {
          this.seen.delete(id);
        }
      }
    }
  }
}
