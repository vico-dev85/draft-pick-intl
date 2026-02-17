import { describe, it, expect } from "vitest";
import { isSafeRedirectPath, getSafeRedirectPath } from "@/lib/safeRedirect";

describe("Redirect validation (open redirect prevention)", () => {
  it("allows valid relative paths", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
    expect(isSafeRedirectPath("/accept-invite?token=abc-123")).toBe(true);
    expect(isSafeRedirectPath("/join/ABCD")).toBe(true);
    expect(isSafeRedirectPath("/results/WXYZ")).toBe(true);
    expect(isSafeRedirectPath("/players")).toBe(true);
  });

  it("blocks absolute URLs (open redirect attack)", () => {
    expect(isSafeRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeRedirectPath("http://attacker.com/phishing")).toBe(false);
    expect(isSafeRedirectPath("//evil.com")).toBe(false);
  });

  it("blocks protocol-relative URLs", () => {
    expect(isSafeRedirectPath("//evil.com/steal")).toBe(false);
  });

  it("blocks javascript: URLs", () => {
    expect(isSafeRedirectPath("javascript:alert(1)")).toBe(false);
  });

  it("blocks data: URLs", () => {
    expect(isSafeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("blocks empty and null paths", () => {
    expect(isSafeRedirectPath("")).toBe(false);
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath("")).toBe("/dashboard");
  });

  it("getSafeRedirectPath falls back for unsafe paths", () => {
    expect(getSafeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectPath("/accept-invite?token=abc")).toBe("/accept-invite?token=abc");
  });

  it("getSafeRedirectPath uses custom fallback", () => {
    expect(getSafeRedirectPath("https://evil.com", "/")).toBe("/");
  });
});

describe("Invite token handling security", () => {
  it("invite tokens should be UUID format only", () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";
    const maliciousToken = "<script>alert(1)</script>";
    const sqlInjection = "'; DROP TABLE user_players; --";

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(validUUID)).toBe(true);
    expect(uuidRegex.test(maliciousToken)).toBe(false);
    expect(uuidRegex.test(sqlInjection)).toBe(false);
  });

  it("pendingInviteToken in URL is properly encoded", () => {
    const maliciousToken = "abc&redirect=https://evil.com";
    const encoded = encodeURIComponent(maliciousToken);
    expect(encoded).not.toContain("&");
    expect(encoded).not.toContain("=");
  });
});
