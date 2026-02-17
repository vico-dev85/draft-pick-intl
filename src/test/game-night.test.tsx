import { describe, it, expect } from "vitest";
import { renderWithProviders } from "./test-utils";
import GameNight from "@/pages/GameNight";
import NightResults from "@/pages/NightResults";

describe("Game Night page smoke tests", () => {
  it("GameNight renders without crashing", () => {
    const { container } = renderWithProviders(<GameNight />);
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("NightResults renders without crashing", () => {
    const { container } = renderWithProviders(<NightResults />);
    expect(container.querySelector("div")).toBeTruthy();
  });
});
