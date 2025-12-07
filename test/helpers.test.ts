/**
 * @file helpers.test.ts
 * @description Comprehensive tests for ticket helper functions
 */

import { describe, it, expect } from "vitest";
import {
  isTicketExpired,
  validateNonceSequence,
  calculateSplitAmounts,
  formatTicketForDisplay,
  isTicketTimingValid,
  areTicketsEqual,
  getTimeUntilExpiry,
  meetsConfidenceThreshold,
} from "../src/helpers";
import type { ResolveTicket } from "../src/schema";

// Helper to create a mock ticket
const createMockTicket = (overrides?: Partial<ResolveTicket>): ResolveTicket => ({
  schema: "escrow.v1.ResolveTicket",
  deal_id: "test-deal-123",
  action: "RELEASE",
  split_bps: 0,
  rationale_cid: "QmTest1234567890123456789012345678901234567890",
  confidence: 0.95,
  nonce: 1,
  expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  ...overrides,
});

describe("isTicketExpired", () => {
  it("should return false for future expiry", () => {
    const ticket = createMockTicket();
    expect(isTicketExpired(ticket)).toBe(false);
  });

  it("should return true for past expiry", () => {
    const ticket = createMockTicket({
      expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    });
    expect(isTicketExpired(ticket)).toBe(true);
  });

  it("should use custom current time when provided", () => {
    const ticket = createMockTicket({ expires_at: 1000 });
    expect(isTicketExpired(ticket, 999)).toBe(false);
    expect(isTicketExpired(ticket, 1001)).toBe(true);
  });

  it("should return true when current time equals expiry time", () => {
    const ticket = createMockTicket({ expires_at: 1000 });
    expect(isTicketExpired(ticket, 1000)).toBe(false);
    expect(isTicketExpired(ticket, 1001)).toBe(true);
  });
});

describe("validateNonceSequence", () => {
  it("should accept strictly increasing nonces", () => {
    const ticket = createMockTicket({ nonce: 10 });
    const result = validateNonceSequence(ticket, 9);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject equal nonces", () => {
    const ticket = createMockTicket({ nonce: 5 });
    const result = validateNonceSequence(ticket, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("must be greater than");
  });

  it("should reject decreasing nonces", () => {
    const ticket = createMockTicket({ nonce: 3 });
    const result = validateNonceSequence(ticket, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("must be greater than");
  });

  it("should reject nonce gaps larger than 100", () => {
    const ticket = createMockTicket({ nonce: 150 });
    const result = validateNonceSequence(ticket, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("gap too large");
  });

  it("should accept nonce gap of exactly 100", () => {
    const ticket = createMockTicket({ nonce: 101 });
    const result = validateNonceSequence(ticket, 1);
    expect(result.valid).toBe(true);
  });
});

describe("calculateSplitAmounts", () => {
  it("should calculate 50/50 split correctly", () => {
    const result = calculateSplitAmounts(1000000, 5000);
    expect(result.sellerAmount).toBe(500000);
    expect(result.buyerAmount).toBe(500000);
  });

  it("should calculate 75/25 split correctly", () => {
    const result = calculateSplitAmounts(1000000, 7500);
    expect(result.sellerAmount).toBe(750000);
    expect(result.buyerAmount).toBe(250000);
  });

  it("should calculate 100% to seller (10000 bps)", () => {
    const result = calculateSplitAmounts(1000000, 10000);
    expect(result.sellerAmount).toBe(1000000);
    expect(result.buyerAmount).toBe(0);
  });

  it("should calculate 0% to seller (0 bps)", () => {
    const result = calculateSplitAmounts(1000000, 0);
    expect(result.sellerAmount).toBe(0);
    expect(result.buyerAmount).toBe(1000000);
  });

  it("should handle rounding correctly", () => {
    const result = calculateSplitAmounts(1000, 3333); // 33.33%
    expect(result.sellerAmount).toBe(333);
    expect(result.buyerAmount).toBe(667);
    expect(result.sellerAmount + result.buyerAmount).toBe(1000);
  });

  it("should throw error for negative split_bps", () => {
    expect(() => calculateSplitAmounts(1000000, -1)).toThrow();
  });

  it("should throw error for split_bps > 10000", () => {
    expect(() => calculateSplitAmounts(1000000, 10001)).toThrow();
  });
});

describe("formatTicketForDisplay", () => {
  it("should format RELEASE ticket correctly", () => {
    const ticket = createMockTicket({
      deal_id: "deal-abc",
      action: "RELEASE",
      confidence: 0.92,
      nonce: 5,
      rationale_cid: "QmTest",
      expires_at: 1733577600, // 2024-12-07 12:00:00 UTC
    });
    
    const formatted = formatTicketForDisplay(ticket);
    expect(formatted).toContain("Deal: deal-abc");
    expect(formatted).toContain("Action: RELEASE");
    expect(formatted).toContain("Confidence: 92.0%");
    expect(formatted).toContain("Nonce: 5");
    expect(formatted).toContain("Rationale: QmTest");
  });

  it("should format SPLIT ticket with percentages", () => {
    const ticket = createMockTicket({
      action: "SPLIT",
      split_bps: 6000, // 60% seller, 40% buyer
    });
    
    const formatted = formatTicketForDisplay(ticket);
    expect(formatted).toContain("SPLIT (60.0% seller, 40.0% buyer)");
  });

  it("should format REFUND ticket correctly", () => {
    const ticket = createMockTicket({
      action: "REFUND",
    });
    
    const formatted = formatTicketForDisplay(ticket);
    expect(formatted).toContain("Action: REFUND");
  });
});

describe("isTicketTimingValid", () => {
  it("should accept ticket with valid lifetime", () => {
    const now = 1000;
    const ticket = createMockTicket({
      expires_at: now + 3600, // 1 hour from now
    });
    
    const result = isTicketTimingValid(ticket, now);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should reject expired ticket", () => {
    const now = 1000;
    const ticket = createMockTicket({
      expires_at: now - 10, // 10 seconds ago
    });
    
    const result = isTicketTimingValid(ticket, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("should reject ticket with lifetime > 24 hours", () => {
    const now = 1000;
    const ticket = createMockTicket({
      expires_at: now + (25 * 60 * 60), // 25 hours
    });
    
    const result = isTicketTimingValid(ticket, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("exceeds maximum");
  });

  it("should reject ticket with lifetime < 60 seconds", () => {
    const now = 1000;
    const ticket = createMockTicket({
      expires_at: now + 30, // 30 seconds
    });
    
    const result = isTicketTimingValid(ticket, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("less than minimum");
  });

  it("should accept ticket with exactly 60 seconds lifetime", () => {
    const now = 1000;
    const ticket = createMockTicket({
      expires_at: now + 60,
    });
    
    const result = isTicketTimingValid(ticket, now);
    expect(result.valid).toBe(true);
  });
});

describe("areTicketsEqual", () => {
  it("should return true for identical tickets", () => {
    const ticket1 = createMockTicket();
    const ticket2 = createMockTicket();
    expect(areTicketsEqual(ticket1, ticket2)).toBe(true);
  });

  it("should return false when deal_id differs", () => {
    const ticket1 = createMockTicket({ deal_id: "deal-1" });
    const ticket2 = createMockTicket({ deal_id: "deal-2" });
    expect(areTicketsEqual(ticket1, ticket2)).toBe(false);
  });

  it("should return false when action differs", () => {
    const ticket1 = createMockTicket({ action: "RELEASE" });
    const ticket2 = createMockTicket({ action: "REFUND" });
    expect(areTicketsEqual(ticket1, ticket2)).toBe(false);
  });

  it("should return false when split_bps differs", () => {
    const ticket1 = createMockTicket({ split_bps: 5000 });
    const ticket2 = createMockTicket({ split_bps: 5001 });
    expect(areTicketsEqual(ticket1, ticket2)).toBe(false);
  });

  it("should return false when confidence differs", () => {
    const ticket1 = createMockTicket({ confidence: 0.9 });
    const ticket2 = createMockTicket({ confidence: 0.91 });
    expect(areTicketsEqual(ticket1, ticket2)).toBe(false);
  });

  it("should return false when nonce differs", () => {
    const ticket1 = createMockTicket({ nonce: 1 });
    const ticket2 = createMockTicket({ nonce: 2 });
    expect(areTicketsEqual(ticket1, ticket2)).toBe(false);
  });
});

describe("getTimeUntilExpiry", () => {
  it("should return positive seconds for future expiry", () => {
    const now = 1000;
    const ticket = createMockTicket({ expires_at: now + 300 });
    expect(getTimeUntilExpiry(ticket, now)).toBe(300);
  });

  it("should return negative seconds for past expiry", () => {
    const now = 1000;
    const ticket = createMockTicket({ expires_at: now - 100 });
    expect(getTimeUntilExpiry(ticket, now)).toBe(-100);
  });

  it("should return 0 when current time equals expiry", () => {
    const now = 1000;
    const ticket = createMockTicket({ expires_at: now });
    expect(getTimeUntilExpiry(ticket, now)).toBe(0);
  });
});

describe("meetsConfidenceThreshold", () => {
  it("should return true when confidence meets threshold", () => {
    const ticket = createMockTicket({ confidence: 0.8 });
    expect(meetsConfidenceThreshold(ticket, 0.7)).toBe(true);
  });

  it("should return true when confidence equals threshold", () => {
    const ticket = createMockTicket({ confidence: 0.8 });
    expect(meetsConfidenceThreshold(ticket, 0.8)).toBe(true);
  });

  it("should return false when confidence below threshold", () => {
    const ticket = createMockTicket({ confidence: 0.6 });
    expect(meetsConfidenceThreshold(ticket, 0.7)).toBe(false);
  });

  it("should throw error for invalid threshold < 0", () => {
    const ticket = createMockTicket();
    expect(() => meetsConfidenceThreshold(ticket, -0.1)).toThrow();
  });

  it("should throw error for invalid threshold > 1", () => {
    const ticket = createMockTicket();
    expect(() => meetsConfidenceThreshold(ticket, 1.1)).toThrow();
  });
});
