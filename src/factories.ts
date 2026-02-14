import { z } from "zod";
import { schema, type ResolveTicket } from "./schema";

/**
 * Partial input type where defaults are optional
 */
type CreateTicketInput = Omit<ResolveTicket, "nonce" | "expires_at"> & {
  nonce?: number;
  expires_at?: number;
  expires_in?: number; // helper to set expiration relative to now
};

export const DEFAULT_EXPIRY_SECONDS = 3600;

export function createTicket(input: CreateTicketInput): ResolveTicket {
  const now = Math.floor(Date.now() / 1000);
  
  const ticket = {
    ...input,
    nonce: input.nonce ?? Date.now(), // simple default, or use random
    expires_at: input.expires_at ?? (now + (input.expires_in || DEFAULT_EXPIRY_SECONDS)),
  };

  // Strip the helper field 'expires_in' if it leaked into the object
  // (though TS should prevent access, runtime might keep it)
  // Then validate:
  return schema.parse(ticket);
}
