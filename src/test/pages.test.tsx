import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import AcceptInvite from "@/pages/AcceptInvite";
import QuickDraft from "@/pages/QuickDraft";

describe("Page smoke tests", () => {
  it("Landing renders without crashing", () => {
    const { container } = renderWithProviders(<Landing />);
    expect(container.querySelector("main, header, div")).toBeTruthy();
  });

  it("Auth renders login form", () => {
    renderWithProviders(<Auth />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with email")).toBeInTheDocument();
  });

  it("AcceptInvite shows error when no token provided", async () => {
    renderWithProviders(<AcceptInvite />);
    // Without a token, page shows error state
    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
    expect(screen.getByText("Invite link is missing")).toBeInTheDocument();
  });

  it("QuickDraft renders name input", () => {
    renderWithProviders(<QuickDraft />);
    expect(screen.getByPlaceholderText(/Friday/i)).toBeInTheDocument();
  });
});
