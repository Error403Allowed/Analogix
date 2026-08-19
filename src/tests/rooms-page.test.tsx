// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RoomsPage from "@/views/RoomsPage";
import type { StudyRoom } from "@/types/rooms";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/responsive-sheet", () => ({
  ResponsiveSheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  ResponsiveSheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveSheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveSheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  ResponsiveSheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ResponsiveSheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/nav/MobileFAB", () => ({
  default: () => null,
}));

const makeRoom = (overrides: Partial<StudyRoom>): StudyRoom => ({
  id: "r1",
  title: "My Room",
  topic: null,
  visibility: "private",
  joinCode: "ABC123",
  ownerUserId: "u1",
  memberCount: 2,
  permissions: {
    canShareDocuments: true,
    canInviteMembers: false,
    canManageRoles: false,
    canDeleteMessages: false,
    canControlTimer: false,
  },
  timerState: "idle",
  timerDurationSeconds: 1500,
  timerElapsedSeconds: 0,
  timerStartedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  viewerRole: "host",
  isOwner: true,
  ...overrides,
});

const ownedRoom = makeRoom({ id: "r1", title: "My Room", isOwner: true, viewerRole: "host" });
const joinedRoom = makeRoom({
  id: "r2",
  title: "Joined Room",
  ownerUserId: "u2",
  isOwner: false,
  viewerRole: "member",
});

const fetchMock = vi.fn();

describe("RoomsPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ rooms: [ownedRoom, joinedRoom], publicRooms: [], memberRooms: [ownedRoom, joinedRoom] }),
          { status: 200 },
        ),
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("shows a delete button only for rooms the user owns", async () => {
    render(<RoomsPage />);

    expect(await screen.findByRole("button", { name: "Delete My Room" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Joined Room" })).not.toBeInTheDocument();
  });

  it("deletes an owned room after confirmation", async () => {
    render(<RoomsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete My Room" }));
    expect(screen.getByText("Delete room?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete room" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/rooms/r1", { method: "DELETE" });
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Delete My Room" })).not.toBeInTheDocument();
    });
  });

  it("keeps the room when deletion is cancelled", async () => {
    render(<RoomsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete My Room" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetchMock).not.toHaveBeenCalledWith("/api/rooms/r1", { method: "DELETE" });
    expect(screen.getByRole("button", { name: "Delete My Room" })).toBeInTheDocument();
  });
});