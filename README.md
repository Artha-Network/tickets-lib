# tickets-lib
Single source of truth for ResolveTicket schema (zod), canonical CBOR encode/verify, ed25519 sign/verify.

---


```md
# @trust-escrow/tickets-lib

Single source of truth for **ResolveTicket**:
- zod schema
- Canonical CBOR encode/decode
- ed25519 sign/verify helpers

## Install
```bash
pnpm add @trust-escrow/tickets-lib

Usage
import { schema, encodeCbor, sign, verify } from "@trust-escrow/tickets-lib";

const msg = schema.parse({
  schema: "escrow.v1.ResolveTicket",
  deal_id: "...",
  action: "RELEASE",
  split_bps: 0,
  rationale_cid: "bafy...",
  confidence: 0.9,
  nonce: 1,
  expires_at: Math.floor(Date.now()/1000)+3600
});
const bytes = encodeCbor(msg);
const sig = sign(bytes, process.env.TICKET_SIGNING_SECRET!);
const ok  = verify(bytes, sig, pubkey);
Exports

schema (zod)

encodeCbor, decodeCbor

sign, verify

types.ts

Tests

Golden CBOR vectors

Cross-impl signature compatibility

License

MIT
