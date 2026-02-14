import fs from 'fs';
import path from 'path';
import { schema } from '../src/schema';
import { encodeCbor } from '../src/cbor';
import { sign } from '../src/ed25519';
import { generateKeyPair } from 'crypto'; // Or your ed25519 lib

// 1. Setup specific test scenarios
const SCENARIOS = [
  {
    name: "standard_release",
    ticket: {
      schema: "escrow.v1.ResolveTicket",
      deal_id: "deal_123456789",
      action: "RELEASE",
      split_bps: 500, // 5%
      rationale_cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      confidence: 0.95,
      nonce: 101,
      expires_at: 1735689600 // Fixed date for reproducibility (Jan 1 2025)
    }
  },
  {
    name: "max_values",
    ticket: {
      schema: "escrow.v1.ResolveTicket",
      deal_id: "deal_999999999",
      action: "REFUND",
      split_bps: 10000, // 100%
      rationale_cid: "QmX...", 
      confidence: 1.0,
      nonce: Number.MAX_SAFE_INTEGER,
      expires_at: 2147483647 // Max 32-bit integer
    }
  }
];

async function main() {
  // Use a fixed keypair for "Golden" vectors so they are deterministic
  // IN REALITY: Load these from env or a safe constant, DO NOT use random for golden vectors
  const PRIVATE_KEY_HEX = "YOUR_DETERMINISTIC_TEST_PRIVATE_KEY_HERE"; 
  const PUBLIC_KEY_HEX = "YOUR_DETERMINISTIC_TEST_PUBLIC_KEY_HERE"; 

  const vectors = SCENARIOS.map(scenario => {
    // 1. Parse/Validate
    const parsed = schema.parse(scenario.ticket);
    
    // 2. Encode
    const cborBytes = encodeCbor(parsed);
    
    // 3. Sign
    const signature = sign(cborBytes, PRIVATE_KEY_HEX);

    return {
      name: scenario.name,
      input: scenario.ticket,
      output: {
        cbor_hex: Buffer.from(cborBytes).toString('hex'),
        signature_hex: Buffer.from(signature).toString('hex'),
        signer_pubkey_hex: PUBLIC_KEY_HEX
      }
    };
  });

  const outputPath = path.join(__dirname, '../vectors/golden.json');
  fs.writeFileSync(outputPath, JSON.stringify(vectors, null, 2));
  console.log(`✅ Generated ${vectors.length} golden vectors at ${outputPath}`);
}

main().catch(console.error);
