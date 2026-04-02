// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { ManageTagsModal, type CustomEventType } from "@/views/CalendarPage";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/utils/eventStore", () => ({
  eventStore: {
    getAll: vi.fn(async () => []),
    add: vi.fn(async () => {}),
    addMultiple: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    clearAll: vi.fn(async () => {}),
  },
}));

vi.mock("framer-motion", () => {
  const MotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  }>(({ initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }, ref) => (
    <div ref={ref} {...props} />
  ));

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: { div: MotionDiv },
  };
});

function TagModalHarness() {
  const [customTypes, setCustomTypes] = React.useState<CustomEventType[]>([
    { key: "study", label: "Study", icon: "📚", color: "#22c55e" },
  ]);
  const [deletedBuiltins, setDeletedBuiltins] = React.useState<string[]>([]);
  const [builtinOverrides, setBuiltinOverrides] = React.useState<Record<string, { label?: string; color?: string; icon?: string }>>({});

  return (
    <ManageTagsModal
      customTypes={customTypes}
      deletedBuiltins={deletedBuiltins}
      builtinOverrides={builtinOverrides}
      onClose={() => {}}
      onChange={setCustomTypes}
      onDeletedBuiltinsChange={setDeletedBuiltins}
      onBuiltinOverridesChange={setBuiltinOverrides}
      onAddCustomType={(label, icon, color) => {
        const trimmedLabel = label.trim();
        if (!trimmedLabel) return null;

        const key = trimmedLabel
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        if (!key) return null;

        const customType = { key, label: trimmedLabel, icon, color };
        setCustomTypes((current) => current.some((type) => type.key === key) ? current : [...current, customType]);
        return customType;
      }}
    />
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // Needed for manual React DOM act() usage in jsdom.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root.render(<TagModalHarness />);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function getButtonByName(name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === name ||
      candidate.textContent?.trim() === name,
  );

  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function getInputByValue(value: string) {
  const input = Array.from(container.querySelectorAll("input")).find(
    (candidate) => candidate.value === value,
  );

  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}

function changeInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  expect(valueSetter).toBeTruthy();
  act(() => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("ManageTagsModal", () => {
  it("adds a custom tag from the add section", () => {
    const input = container.querySelector('input[aria-label="New tag name"]') as HTMLInputElement | null;

    expect(input).toBeTruthy();
    changeInput(input as HTMLInputElement, "Errands");
    click(getButtonByName("Add Tag"));

    expect(container.textContent).toContain("Errands");
  });

  it("renames an existing custom tag", () => {
    click(getButtonByName("Edit Study tag"));
    changeInput(getInputByValue("Study"), "Deep Work");
    click(getButtonByName("Save"));

    expect(container.textContent).toContain("Deep Work");
  });

  it("renames a built-in tag", () => {
    click(getButtonByName("Edit Exam tag"));
    changeInput(getInputByValue("Exam"), "Assessment");
    click(getButtonByName("Save"));

    expect(container.textContent).toContain("Assessment");
  });
});
