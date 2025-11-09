/**
 * ResolveTicket schema tests.
 *
 * These tests assert the invariants that callers and verifiers rely on:
 * - Shape and types are enforced by Zod
 * - Action-to-split_bps consistency
 * - Version literal anchors compatibility contracts
 *
 * Run with:
 *   pnpm test
 */

import { describe, it, expect } from "vitest";
import { schema, RESOLVE_TICKET_VERSION } from "../src";

const base = {
  schema: RESOLVE_TICKET_VERSION,
  deal_id: "D-42",
  rationale_cid: "bafybeigdyrqexamplecid",
  confidence: 0.9,
  nonce: 1,
  expires_at: 2_000_000_000
};

describe("ResolveTicket schema", () => {
  it("accepts RELEASE with split_bps = 0", () => {
    const t = schema.parse({
      ...base,
      action: "RELEASE",
      split_bps: 0
    });
    expect(t.action).toBe("RELEASE");
    expect(t.split_bps).toBe(0);
  });

  it("accepts REFUND with split_bps = 0", () => {
    const t = schema.parse({
      ...base,
      action: "REFUND",
      split_bps: 0
    });
    expect(t.action).toBe("REFUND");
    expect(t.split_bps).toBe(0);
  });

  it("accepts SPLIT with 1..9999 bps", () => {
    const t = schema.parse({
      ...base,
      action: "SPLIT",
      split_bps: 7000
    });
    expect(t.action).toBe("SPLIT");
    expect(t.split_bps).toBe(7000);
  });

  it("rejects SPLIT with 0 bps", () => {
    const res = schema.safeParse({
      ...base,
      action: "SPLIT",
      split_bps: 0
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      // Expect an issue pointing to split_bps
      const msg = res.error.issues.map(i => `${i.path.join(".")}:${i.message}`).join("|");
      expect(msg).toMatch(/split_bps/i);
    }
  });

  it("rejects SPLIT with 10000 bps", () => {
    const res = schema.safeParse({
      ...base,
      action: "SPLIT",
      split_bps: 10_000
    });
    expect(res.success).toBe(false);
  });

  it("rejects RELEASE when split_bps != 0", () => {
    const res = schema.safeParse({
      ...base,
      action: "RELEASE",
      split_bps: 1
    });
    expect(res.success).toBe(false);
  });

  it("rejects REFUND when split_bps != 0", () => {
    const res = schema.safeParse({
      ...base,
      action: "REFUND",
      split_bps: 1
    });
    expect(res.success).toBe(false);
  });

  it("requires non-empty deal_id", () => {
    const res = schema.safeParse({
      ...base,
      deal_id: "",
      action: "RELEASE",
      split_bps: 0
    });
    expect(res.success).toBe(false);
  });

  it("requires expires_at to be positive int", () => {
    const res = schema.safeParse({
      ...base,
      expires_at: 0,
      action: "RELEASE",
      split_bps: 0
    });
    expect(res.success).toBe(false);
  });

  it("anchors to the expected version literal", () => {
    const t = schema.parse({
      ...base,
      action: "RELEASE",
      split_bps: 0
    });
    expect(t.schema).toBe(RESOLVE_TICKET_VERSION);
  });
});
