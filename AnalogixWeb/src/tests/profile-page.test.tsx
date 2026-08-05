// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfilePage from "@/views/ProfilePage";

const signOutMock = vi.fn().mockResolvedValue(undefined);
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/profile",
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "student@example.com" },
    signOut: signOutMock,
    loading: false,
  }),
}));

vi.mock("@/components/ProfileSheet", () => ({
  default: () => null,
}));

vi.mock("@/components/AppearanceSection", () => ({
  default: () => null,
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    signOutMock.mockClear();
    pushMock.mockClear();
  });

  it("renders the account menu", () => {
    render(<ProfilePage />);
    expect(screen.getByText("My Subjects")).toBeInTheDocument();
    expect(screen.getByText("Achievements")).toBeInTheDocument();
    expect(screen.getByText("Study Rooms")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("renders a sign out row", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("falls back to the email prefix for the display name", () => {
    render(<ProfilePage />);
    expect(screen.getByText("student")).toBeInTheDocument();
  });

  it("signs out and navigates to /login", async () => {
    render(<ProfilePage />);
    const signOut = screen.getByText("Sign out");
    fireEvent.click(signOut);
    expect(signOutMock).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
