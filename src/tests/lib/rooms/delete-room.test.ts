import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRoomAccess: vi.fn(),
}));

vi.mock("@/lib/rooms/server", () => ({
  requireRoomAccess: mocks.requireRoomAccess,
  requireRoomControl: vi.fn(),
  getRoomState: vi.fn(),
}));

import { DELETE } from "@/app/api/rooms/[roomId]/route";

const mockContext = (roomId: string) => ({
  params: Promise.resolve({ roomId }),
});

describe("DELETE /api/rooms/[roomId]", () => {
  beforeEach(() => {
    mocks.requireRoomAccess.mockReset();
  });

  it("deletes the room when the caller is the owner", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    mocks.requireRoomAccess.mockResolvedValue({
      supabase: {
        from: () => ({
          delete: () => ({ eq }),
        }),
      },
      isOwner: true,
    });

    const res = await DELETE(
      new Request("http://localhost/api/rooms/room-1", { method: "DELETE" }),
      mockContext("room-1"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(eq).toHaveBeenCalledWith("id", "room-1");
  });

  it("returns 403 without deleting when the caller is not the owner", async () => {
    const eq = vi.fn();
    mocks.requireRoomAccess.mockResolvedValue({
      supabase: {
        from: () => ({
          delete: () => ({ eq }),
        }),
      },
      isOwner: false,
    });

    const res = await DELETE(
      new Request("http://localhost/api/rooms/room-1", { method: "DELETE" }),
      mockContext("room-1"),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Only the room owner can delete this room" });
    expect(eq).not.toHaveBeenCalled();
  });

  it("returns 500 when the database delete fails", async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error("boom") });
    mocks.requireRoomAccess.mockResolvedValue({
      supabase: {
        from: () => ({
          delete: () => ({ eq }),
        }),
      },
      isOwner: true,
    });

    const res = await DELETE(
      new Request("http://localhost/api/rooms/room-1", { method: "DELETE" }),
      mockContext("room-1"),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to delete room" });
  });
});