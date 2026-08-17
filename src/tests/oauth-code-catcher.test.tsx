// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import OAuthCodeCatcher from "@/components/auth/OAuthCodeCatcher";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/auth-callback", () => ({
  redirectWithError: vi.fn((origin: string, code: string, desc: string | null) =>
    `${origin}/login?error=auth_failed&error_code=${encodeURIComponent(code)}${
      desc ? `&error_description=${encodeURIComponent(desc)}` : ""
    }`
  ),
  completeAuthCodeExchange: vi.fn(),
}));

const goto = (path: string) => window.history.replaceState({}, "", path);

describe("OAuthCodeCatcher", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    goto("/");
  });

  it("ignores the app's own auth_failed signal on /login", () => {
    goto("/login?error=auth_failed&error_code=access_denied&error_description=Denied");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<OAuthCodeCatcher />);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("forwards a raw Supabase OAuth error to /login", () => {
    goto("/?error=access_denied&error_description=The+user+cancelled");
    render(<OAuthCodeCatcher />);
    const origin = window.location.origin;
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      `${origin}/login?error=auth_failed&error_code=access_denied&error_description=The%20user%20cancelled`
    );
  });

  it("does not process errors on paths that handle auth themselves", () => {
    goto("/auth/callback?error=access_denied");
    render(<OAuthCodeCatcher />);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});