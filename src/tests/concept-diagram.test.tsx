// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConceptDiagram, {
  type ConceptDiagramSpec,
  type ThreeSceneSpec,
  type ConceptNode,
  type ThreeObject,
} from "@/components/graphing/ConceptDiagram";
import { buildSystemPrompt } from "@/lib/ai/prompt";

const spec: ConceptDiagramSpec = {
  title: "Water Molecule",
  description: "H2O structure",
  sceneType: "molecule",
  objects: [
    { id: "o", shape: "sphere", label: "Oxygen", color: "#ff0000", size: 1, position: { x: 0, y: 0, z: 0 } },
    { id: "h1", shape: "sphere", label: "Hydrogen", color: "#ffffff", size: 0.6, position: { x: -1, y: 1, z: 0 } },
    { id: "h2", shape: "sphere", label: "Hydrogen", color: "#ffffff", size: 0.6, position: { x: 1, y: 1, z: 0 } },
  ],
  connections: [{ from: "o", to: "h1" }],
  analogyHint: "Mickey Mouse head",
};

describe("ConceptDiagram", () => {
  it("renders title, description, node labels, and analogy hint", () => {
    render(<ConceptDiagram spec={spec} />);
    expect(screen.getByText("Water Molecule")).toBeTruthy();
    expect(screen.getByText("H2O structure")).toBeTruthy();
    expect(screen.getByText("Oxygen")).toBeTruthy();
    expect(screen.getAllByText("Hydrogen").length).toBe(2);
    expect(screen.getByText(/Mickey Mouse head/)).toBeTruthy();
  });

  it("renders node shapes and connections as SVG", () => {
    render(<ConceptDiagram spec={spec} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    // 3 sphere nodes -> 3 groups with circles, 1 connection line (dashed)
    expect(svg?.querySelectorAll("circle").length).toBeGreaterThanOrEqual(3);
    expect(svg?.querySelectorAll('line[stroke-dasharray="4 4"]').length).toBe(1);
  });

  it("keeps legacy Three* type aliases working", () => {
    const legacy: ThreeSceneSpec = spec;
    const node: ThreeObject = legacy.objects[0];
    const asNew: ConceptNode = node;
    expect(asNew.id).toBe("o");
  });
});

describe("concept-diagram prompt (no three.js)", () => {
  const messages = [{ role: "user", content: "visualise the water molecule in 3d please" }];

  it("emits a ```concept fence instead of ```three", () => {
    const prompt = buildSystemPrompt({ userContext: {}, messages });
    expect(prompt).toContain("```concept");
    expect(prompt).not.toContain("```three");
  });

  it("never mentions three.js", () => {
    const prompt = buildSystemPrompt({ userContext: {}, messages });
    expect(prompt.toLowerCase()).not.toContain("three.js");
  });
});
