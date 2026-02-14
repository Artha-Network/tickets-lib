// Utility for branding
type Brand<K, T> = K & { __brand: T };

export type DealId = Brand<string, "DealId">;
export type RationaleCid = Brand<string, "RationaleCid">;
export type SignatureHex = Brand<string, "SignatureHex">;

// Helper constructors (runtime checks can go here)
export const makeDealId = (id: string): DealId => {
  if (!id.startsWith("deal_")) throw new Error("Invalid Deal ID format");
  return id as DealId;
};

export const makeRationaleCid = (cid: string): RationaleCid => {
  // Add CID validation logic here (e.g. check length or prefix)
  return cid as RationaleCid;
};
