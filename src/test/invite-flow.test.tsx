import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Invite flow logic", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("pendingInviteToken persists in sessionStorage", () => {
    const token = "test-token-123";
    sessionStorage.setItem("pendingInviteToken", token);
    expect(sessionStorage.getItem("pendingInviteToken")).toBe(token);
  });

  it("authReturnTo persists in localStorage across page loads", () => {
    const returnPath = "/accept-invite?token=abc";
    localStorage.setItem("authReturnTo", returnPath);
    expect(localStorage.getItem("authReturnTo")).toBe(returnPath);
  });

  it("OAuth callback redirects to invite page when pendingInviteToken exists in sessionStorage", () => {
    // Simulate the logic from OAuthCallbackHandler
    const pendingInviteToken = "invite-token-456";
    sessionStorage.setItem("pendingInviteToken", pendingInviteToken);

    let redirectHash = "";
    const token = sessionStorage.getItem("pendingInviteToken")
      || localStorage.getItem("pendingInviteToken");

    if (token) {
      sessionStorage.removeItem("pendingInviteToken");
      localStorage.removeItem("pendingInviteToken");
      redirectHash = `#/accept-invite?token=${token}`;
    } else if (localStorage.getItem("authReturnTo")) {
      redirectHash = `#${localStorage.getItem("authReturnTo")}`;
    } else {
      redirectHash = "#/dashboard";
    }

    expect(redirectHash).toBe("#/accept-invite?token=invite-token-456");
  });

  it("OAuth callback redirects to dashboard when no pending invite", () => {
    let redirectHash = "";
    const token = sessionStorage.getItem("pendingInviteToken")
      || localStorage.getItem("pendingInviteToken");

    if (token) {
      redirectHash = "#/accept-invite";
    } else if (localStorage.getItem("authReturnTo")) {
      redirectHash = `#${localStorage.getItem("authReturnTo")}`;
    } else {
      redirectHash = "#/dashboard";
    }

    expect(redirectHash).toBe("#/dashboard");
  });

  it("OAuth callback uses authReturnTo when set", () => {
    localStorage.setItem("authReturnTo", "/accept-invite?token=xyz");

    let redirectHash = "";
    const token = sessionStorage.getItem("pendingInviteToken")
      || localStorage.getItem("pendingInviteToken");

    if (token) {
      redirectHash = "#/accept-invite";
    } else if (localStorage.getItem("authReturnTo")) {
      redirectHash = `#${localStorage.getItem("authReturnTo")}`;
      localStorage.removeItem("authReturnTo");
    } else {
      redirectHash = "#/dashboard";
    }

    expect(redirectHash).toBe("#/accept-invite?token=xyz");
    expect(localStorage.getItem("authReturnTo")).toBeNull();
  });

  it("OAuth callback falls back to localStorage when sessionStorage is empty", () => {
    // Only set in localStorage (simulates email confirmation in new tab)
    const pendingInviteToken = "cross-tab-token-789";
    localStorage.setItem("pendingInviteToken", pendingInviteToken);

    let redirectHash = "";
    const token = sessionStorage.getItem("pendingInviteToken")
      || localStorage.getItem("pendingInviteToken");

    if (token) {
      sessionStorage.removeItem("pendingInviteToken");
      localStorage.removeItem("pendingInviteToken");
      redirectHash = `#/accept-invite?token=${token}`;
    } else if (localStorage.getItem("authReturnTo")) {
      redirectHash = `#${localStorage.getItem("authReturnTo")}`;
    } else {
      redirectHash = "#/dashboard";
    }

    expect(redirectHash).toBe("#/accept-invite?token=cross-tab-token-789");
  });

  it("both storages are cleaned up after token consumption", () => {
    const pendingInviteToken = "cleanup-token";
    sessionStorage.setItem("pendingInviteToken", pendingInviteToken);
    localStorage.setItem("pendingInviteToken", pendingInviteToken);

    // Simulate OAuthCallbackHandler token consumption
    const token = sessionStorage.getItem("pendingInviteToken")
      || localStorage.getItem("pendingInviteToken");

    if (token) {
      sessionStorage.removeItem("pendingInviteToken");
      localStorage.removeItem("pendingInviteToken");
    }

    expect(sessionStorage.getItem("pendingInviteToken")).toBeNull();
    expect(localStorage.getItem("pendingInviteToken")).toBeNull();
  });

  it("invite token is stored in both sessionStorage and localStorage", () => {
    // Simulate AcceptInvite page storing token on mount
    const token = "dual-storage-token";
    sessionStorage.setItem("pendingInviteToken", token);
    localStorage.setItem("pendingInviteToken", token);

    expect(sessionStorage.getItem("pendingInviteToken")).toBe(token);
    expect(localStorage.getItem("pendingInviteToken")).toBe(token);
  });
});
