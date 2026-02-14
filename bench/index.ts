import { Bench } from 'tinybench';
import { schema } from '../src/schema';
import { encodeCbor } from '../src/cbor';
import { sign, verify } from '../src/ed25519';
import { generateKeyPair } from 'crypto'; // or your lib

const bench = new Bench({ time: 1000 });

// Setup data
const keypair = generateKeyPair('ed25519', { ... }); 
const ticket = {
  schema: "escrow.v1.ResolveTicket",
  deal_id: "deal_123",
  action: "RELEASE",
  split_bps: 100,
  rationale_cid: "bafy...",
  confidence: 1,
  nonce: 1,
  expires_at: 2000000000
};
const parsed = schema.parse(ticket);
const cbor = encodeCbor(parsed);
const sig = sign(cbor, keypair.privateKey);

bench
  .add('Schema Parse', () => {
    schema.parse(ticket);
  })
  .add('CBOR Encode', () => {
    encodeCbor(parsed);
  })
  .add('Ed25519 Sign', () => {
    sign(cbor, keypair.privateKey);
  })
  .add('Ed25519 Verify', () => {
    verify(cbor, sig, keypair.publicKey);
  });

await bench.run();

console.table(bench.table());
