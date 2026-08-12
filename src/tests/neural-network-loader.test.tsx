// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NeuralNetworkLoader } from "@/components/shared/NeuralNetworkLoader";

describe("NeuralNetworkLoader", () => {
  it("renders the thinking label", () => {
    render(<NeuralNetworkLoader />);
    expect(screen.getByText("Thinking")).toBeTruthy();
  });

  it("renders the minimal neural network svg", () => {
    render(<NeuralNetworkLoader />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.querySelectorAll("line").length).toBe(3);
    expect(svg?.querySelectorAll("circle[data-node]").length).toBe(4);
  });

  it("renders traveling signal pulses through the nodes", () => {
    render(<NeuralNetworkLoader />);
    const svg = document.querySelector("svg");
    const pulses = svg?.querySelectorAll("[data-pulse]");
    expect(pulses).toBeTruthy();
    expect(pulses!.length).toBe(2);
    expect(svg?.querySelectorAll("[data-pulse] circle").length).toBe(4);
  });

  it("animates via native SMIL (animateMotion) so it is never a static image", () => {
    render(<NeuralNetworkLoader />);
    const svg = document.querySelector("svg");
    expect(svg?.querySelectorAll("animateMotion").length).toBe(4);
    expect(svg?.querySelectorAll("[data-pulse] animate").length).toBe(4);
  });

  it("only references plain-safe static gradient ids (no useId colons in url(#...))", () => {
    render(<NeuralNetworkLoader />);
    const svg = document.querySelector("svg");
    const refs = Array.from(svg?.querySelectorAll("line") ?? []).map(l => l.getAttribute("stroke"));
    for (const ref of refs) {
      if (ref && ref.startsWith("url(#") && ref.endsWith(")")) {
        const id = ref.slice("url(#".length, -1);
        expect(id).not.toContain(":");
        expect(document.getElementById(id)).toBeTruthy();
      }
    }
  });

  it("renders three animated dots", () => {
    render(<NeuralNetworkLoader />);
    const dots = document.querySelectorAll("span[aria-hidden] span");
    expect(dots.length).toBe(3);
  });
});