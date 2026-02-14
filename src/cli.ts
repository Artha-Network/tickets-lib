import { Command } from 'commander'; // pnpm add commander
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { schema } from './schema';
import { encodeCbor, decodeCbor } from './cbor';
import { sign, verify } from './ed25519';
import { generateKeyPair } from 'crypto'; // Or your ed25519 lib specific generator

const program = new Command();

program
  .name('tickets-cli')
  .description('CLI for Trust Escrow Tickets')
  .version('0.0.1');

program.command('gen-key')
  .description('Generate a new Ed25519 keypair')
  .action(() => {
    // If your ed25519.ts doesn't have a generator, use node's crypto
    // This is just an example, align with your specific ed25519 implementation
    const { privateKey, publicKey } = generateKeyPair('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    console.log('--- Public Key ---');
    console.log(publicKey);
    console.log('--- Private Key ---');
    console.log(privateKey);
  });

program.command('sign')
  .description('Sign a JSON ticket file')
  .argument('<file>', 'Path to JSON ticket file')
  .requiredOption('-k, --key <secret>', 'Signing secret (hex or env var)')
  .action((filePath, options) => {
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      const json = JSON.parse(content);
      
      // Validate against schema first
      const ticket = schema.parse(json);
      
      const bytes = encodeCbor(ticket);
      // specific implementation depends on how your `sign` function accepts keys
      const sig = sign(bytes, options.key); 
      
      console.log(JSON.stringify({
        payload_hex: Buffer.from(bytes).toString('hex'),
        signature_hex: Buffer.from(sig).toString('hex')
      }, null, 2));
    } catch (e) {
      console.error('Signing failed:', e);
      process.exit(1);
    }
  });

program.command('verify')
  .description('Verify a ticket signature')
  .argument('<payload_hex>', 'CBOR payload in hex')
  .argument('<sig_hex>', 'Signature in hex')
  .argument('<pubkey_hex>', 'Public key in hex')
  .action((payload, sig, pubkey) => {
    const payloadBytes = Buffer.from(payload, 'hex');
    const sigBytes = Buffer.from(sig, 'hex');
    const keyBytes = Buffer.from(pubkey, 'hex'); // Adjust if your verify takes a string

    const isValid = verify(payloadBytes, sigBytes, keyBytes);
    console.log(isValid ? '✅ Valid Signature' : '❌ Invalid Signature');
    
    if (isValid) {
      console.log('Decoded Content:', decodeCbor(payloadBytes));
    } else {
      process.exit(1);
    }
  });

program.parse();
