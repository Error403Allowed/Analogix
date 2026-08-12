// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReExplainMenu } from "@/components/chat/ReExplainMenu";

const hobbies = ["RPG games", "Soccer", "Baking"];

function renderMenu(props: Partial<React.ComponentProps<typeof ReExplainMenu>> = {}) {
  return render(
    <div>
      <ReExplainMenu
        open={false}
        hobbies={hobbies}
        onSelect={() => {}}
        onClose={() => {}}
        {...props}
      />
    </div>
  );
}

describe("ReExplainMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when closed", () => {
    const { container } = renderMenu();
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("renders the surprise-me option when open", () => {
    renderMenu({ open: true });
    expect(screen.getByText("Surprise me")).toBeTruthy();
  });

  it("calls onSelect with no anchor when Surprise me is clicked", () => {
    const onSelect = vi.fn();
    renderMenu({ open: true, onSelect });
    fireEvent.click(screen.getByText("Surprise me"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBeUndefined();
  });

  it("lists each interest and calls onSelect with the interest", () => {
    const onSelect = vi.fn();
    renderMenu({ open: true, onSelect });
    for (const h of hobbies) {
      expect(screen.getByText(h)).toBeTruthy();
    }
    fireEvent.click(screen.getByText("Soccer"));
    expect(onSelect).toHaveBeenCalledWith("Soccer");
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderMenu({ open: true, onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on outside click", () => {
    const onClose = vi.fn();
    renderMenu({ open: true, onClose });
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
