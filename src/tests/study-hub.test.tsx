// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StudyHub, { STUDY_TOOLS } from "@/views/StudyHub";

describe("STUDY_TOOLS", () => {
  it("lists the six study tools", () => {
    expect(STUDY_TOOLS).toHaveLength(6);
    expect(STUDY_TOOLS.map((t) => t.label)).toEqual([
      "Flashcards",
      "Quiz",
      "Calendar",
      "Formulas",
      "Timer",
      "Resources",
    ]);
  });

  it("maps every tool to a valid internal route", () => {
    for (const tool of STUDY_TOOLS) {
      expect(tool.path).toMatch(/^\//);
    }
  });
});

describe("StudyHub", () => {
  it("renders a link for every tool", () => {
    render(<StudyHub />);
    expect(screen.getAllByTestId("study-tool")).toHaveLength(6);
    for (const tool of STUDY_TOOLS) {
      expect(screen.getByText(tool.label)).toBeInTheDocument();
    }
  });

  it("links each tile to its route", () => {
    render(<StudyHub />);
    for (const tool of STUDY_TOOLS) {
      const link = screen.getByText(tool.label).closest("a");
      expect(link).toHaveAttribute("href", tool.path);
    }
  });
});
