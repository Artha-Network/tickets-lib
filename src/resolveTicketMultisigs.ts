import { z } from "zod";
import { verify } from "./ed25519";
import { schema, type ResolveTicket } from "./schema";
import { encodeCbor } from "./cbor";

// Schema for a signature with an associated signer identifier (usually public key)
export const SignedTicketSchema = z.object({
  ticket: schema,
  signatures: z.array(z.object({
    pubKey: z.instanceof(Uint8Array), // or z.string() if you prefer hex
    sig: z.instanceof(Uint8Array)
  }))
});

export type SignedTicket = z.infer<typeof SignedTicketSchema>;

/**
 * Verifies that a ticket has enough valid signatures from a trusted set of signers.
 */
export function verifyQuorum(
  ticket: ResolveTicket,
  signatures: { pubKey: Uint8Array; sig: Uint8Array }[],
  authorizedPubKeys: Uint8Array[],
  threshold: number
): boolean {
  const ticketBytes = encodeCbor(ticket);
  let validCount = 0;
  const usedPubKeys = new Set<string>();

  // Convert authorized keys to strings for easy lookup if necessary, 
  // or simple iteration. Here we iterate for strictness.
  
  for (const { pubKey, sig } of signatures) {
    // 1. Check if pubKey is authorized
    const isAuthorized = authorizedPubKeys.some(k => 
      k.length === pubKey.length && k.every((byte, i) => byte === pubKey[i])
    );
    
    if (!isAuthorized) continue;

    // 2. Prevent double voting
    const keyString = Buffer.from(pubKey).toString('hex');
    if (usedPubKeys.has(keyString)) continue;

    // 3. Verify signature
    if (verify(ticketBytes, sig, pubKey)) {
      usedPubKeys.add(keyString);
      validCount++;
    }
  }

  return validCount >= threshold;
}
