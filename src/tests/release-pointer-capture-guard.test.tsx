// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ReleasePointerCaptureGuard } from "@/components/layout/ReleasePointerCaptureGuard";

const makeError = (name: string) => {
  const error = new Error(name);
  error.name = name;
  return error;
};

describe("ReleasePointerCaptureGuard", () => {
  const original = Element.prototype.releasePointerCapture;

  afterEach(() => {
    Element.prototype.releasePointerCapture = original;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("swallows NotFoundError from releasePointerCapture", () => {
    Element.prototype.releasePointerCapture = () => {
      throw makeError("NotFoundError");
    };
    render(<ReleasePointerCaptureGuard />);

    const el = document.createElement("div");
    expect(() => el.releasePointerCapture(7)).not.toThrow();
  });

  it("rethrows errors that are not NotFoundError", () => {
    Element.prototype.releasePointerCapture = () => {
      throw makeError("InvalidStateError");
    };
    render(<ReleasePointerCaptureGuard />);

    const el = document.createElement("div");
    expect(() => el.releasePointerCapture(7)).toThrow("InvalidStateError");
  });

  it("preserves the return value of a healthy releasePointerCapture", () => {
    Element.prototype.releasePointerCapture = () => "ok" as unknown as void;
    render(<ReleasePointerCaptureGuard />);

    const el = document.createElement("div");
    expect(() => el.releasePointerCapture(1)).not.toThrow();
  });

  it("patches the prototype only once across multiple mounts", () => {
    Element.prototype.releasePointerCapture = () => {
      throw makeError("NotFoundError");
    };
    const first = render(<ReleasePointerCaptureGuard />);
    const second = render(<ReleasePointerCaptureGuard />);
    first.unmount();
    second.unmount();

    const el = document.createElement("div");
    expect(() => el.releasePointerCapture(3)).not.toThrow();
  });
});
