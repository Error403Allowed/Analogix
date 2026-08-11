// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NeuralNetworkLoader } from "@/components/shared/NeuralNetworkLoader";

describe("NeuralNetworkLoader", () => {
  it("renders the thinking label", () => {
    render(<NeuralNetworkLoader />);
    expect(screen.getByText("Thinking")).toBeTruthy();
  });

  it("renders the neural network svg", () => {
    render(<NeuralNetworkLoader />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.querySelectorAll("line").length).toBeGreaterThan(0);
    expect(svg?.querySelectorAll("circle").length).toBe(14);
  });

  it("renders three animated dots", () => {
    render(<NeuralNetworkLoader />);
    const dots = document.querySelectorAll("span[aria-hidden] span");
    expect(dots.length).toBe(3);
  });

  it("uses unique gradient ids to support multiple instances", () => {
    const { rerender } = render(
      <div>
        <NeuralNetworkLoader />
        <NeuralNetworkLoader />
      </div>
    );
    const ids = Array.from(document.querySelectorAll("linearGradient")).map(
      g => g.id
    );
    expect(new Set(ids).size).toBe(ids.length);
    rerender(<div />);
  });
});
