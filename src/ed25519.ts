/**
 * ed25519 signing and verification helpers.
 *
 * Scope
 * - Pure, deterministic helpers for detached signatures over canonical CBOR bytes.
 * - No key generation, storage, or IO. Callers provide key material.
 *
 * Key formats accepted
 * - Secret: Uint8Array of 32 byte seed or 64 byte expanded secret, or a hex string of the same lengths.
 * - Public key: Uint8Array of 32 bytes or a 64 character hex string (optionally 0x prefixed).
 *
 * Important notes
 * - The message must be the exact bytes produced by the canonical encoder.
 * - If a 64 byte secret is provided, only the first 32 bytes are used as the seed for signing.
 * - Always validate tickets before encoding and signing.
 */

import { ed25519 } from "@noble/curves/ed25519";
import { hexToBytes, bytesToHex } from "./utils/bytes";

/** Narrowing helper */
function toBytes(input: Uint8Array | string, name: string): Uint8Array {
  if (typeof input === "string") {
    return hexToBytes(input);
  }
  if (input instanceof Uint8Array) return input;
  throw new Error(`${name} must be a Uint8Array or hex string`);
}

/** Normalize secret to a 32 byte seed suitable for noble ed25519 signing. */
function normalizeSecret(secret: Uint8Array | string): Uint8Array {
  const raw = toBytes(secret, "secret");
  if (raw.length === 32) return raw;
  if (raw.length === 64) return raw.slice(0, 32);
  throw new Error("Invalid ed25519 secret length. Expected 32 or 64 bytes");
}

/** Ensure public key length is correct. */
function normalizePublicKey(publicKey: Uint8Array | string): Uint8Array {
  const pk = toBytes(publicKey, "publicKey");
  if (pk.length !== 32) {
    throw new Error("Invalid ed25519 public key length. Expected 32 bytes");
  }
  return pk;
}

/**
 * Sign a message with an ed25519 secret.
 *
 * @param message canonical CBOR bytes to sign
 * @param secret  32 byte seed or 64 byte expanded secret, as bytes or hex
 * @returns detached signature as Uint8Array of 64 bytes
 */
export function sign(message: Uint8Array, secret: Uint8Array | string): Uint8Array {
  if (!(message instanceof Uint8Array)) {
    throw new Error("message must be Uint8Array");
  }
  const seed = normalizeSecret(secret);
  return ed25519.sign(message, seed);
}

/**
 * Verify an ed25519 detached signature against a message and public key.
 *
 * @param message   canonical CBOR bytes
 * @param signature 64 byte signature as bytes or hex
 * @param publicKey 32 byte public key as bytes or hex
 * @returns boolean indicating signature validity
 */
export function verify(
  message: Uint8Array,
  signature: Uint8Array | string,
  publicKey: Uint8Array | string
): boolean {
  if (!(message instanceof Uint8Array)) {
    throw new Error("message must be Uint8Array");
  }
  const sig = toBytes(signature, "signature");
  if (sig.length !== 64) {
    throw new Error("Invalid ed25519 signature length. Expected 64 bytes");
  }
  const pk = normalizePublicKey(publicKey);
  return ed25519.verify(sig, message, pk);
}

/**
 * Derive a public key from a secret seed.
 *
 * @param secret 32 byte seed or 64 byte expanded secret, bytes or hex
 * @returns 32 byte public key
 */
export function derivePublicKey(secret: Uint8Array | string): Uint8Array {
  const seed = normalizeSecret(secret);
  return ed25519.getPublicKey(seed);
}

/**
 * Convenience export for rendering bytes as lowercase hex without 0x prefix.
 * This is useful in tests and debug logs.
 */
export const toHex = bytesToHex;
