import { type ResolveTicket, schema } from './schema';

export class TicketBuilder {
  private ticket: Partial<ResolveTicket> = {
    schema: "escrow.v1.ResolveTicket",
    split_bps: 0,
    nonce: Date.now(),
    expires_at: Math.floor(Date.now() / 1000) + 3600 // Default 1 hour
  };

  forDeal(dealId: string): this {
    this.ticket.deal_id = dealId;
    return this;
  }

  action(action: 'RELEASE' | 'REFUND'): this {
    this.ticket.action = action;
    return this;
  }

  /**
   * Set split in basis points (0-10000).
   * Throws if out of range.
   */
  split(bps: number): this {
    if (bps < 0 || bps > 10000) {
      throw new Error("Split basis points must be between 0 and 10000");
    }
    this.ticket.split_bps = bps;
    return this;
  }

  rationale(cid: string): this {
    this.ticket.rationale_cid = cid;
    return this;
  }

  confidence(level: number): this {
    if (level < 0 || level > 1) {
      throw new Error("Confidence must be between 0.0 and 1.0");
    }
    this.ticket.confidence = level;
    return this;
  }

  /**
   * Finalize and return the validated ticket object.
   */
  build(): ResolveTicket {
    // Zod schema validation will catch any missing fields
    return schema.parse(this.ticket);
  }
}

// Usage Example:
// const ticket = new TicketBuilder()
//   .forDeal("deal_123")
//   .action("RELEASE")
//   .split(500)
//   .rationale("bafy...")
//   .build();
