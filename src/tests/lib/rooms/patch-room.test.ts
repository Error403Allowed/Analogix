import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRoomControl: vi.fn(),
  getRoomState: vi.fn(),
}));

vi.mock("@/lib/rooms/server", () => ({
  requireRoomControl: mocks.requireRoomControl,
  requireRoomAccess: vi.fn(),
  getRoomState: mocks.getRoomState,
}));

import { PATCH } from "@/app/api/rooms/[roomId]/route";

const mockContext = (roomId: string) => ({
  params: Promise.resolve({ roomId }),
});

const roomRecord = {
  id: "room-1",
  title: "Study room",
  topic: null,
  visibility: "public",
};

function mockRoomServer() {
  const updatePayloads: Record<string, unknown>[] = [];
  mocks.requireRoomControl.mockResolvedValue({
    supabase: {
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        },
      }),
    },
  });
  mocks.getRoomState.mockResolvedValue({ room: roomRecord });
  return updatePayloads;
}

function patchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/rooms/room-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/rooms/[roomId]", () => {
  beforeEach(() => {
    mocks.requireRoomControl.mockReset();
    mocks.getRoomState.mockReset();
  });

  it("updates the title and topic of an existing room", async () => {
    const updatePayloads = mockRoomServer();

    const res = await PATCH(patchRequest({ title: "Chemistry", topic: "VCE Chemistry" }), mockContext("room-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ room: roomRecord });
    expect(updatePayloads[0]?.title).toBe("Chemistry");
    expect(updatePayloads[0]?.topic).toBe("VCE Chemistry");
    expect(updatePayloads[0]?.visibility).toBeUndefined();
  });

  it("clears the topic when an empty string is sent", async () => {
    const updatePayloads = mockRoomServer();

    const res = await PATCH(patchRequest({ topic: "" }), mockContext("room-1"));

    expect(res.status).toBe(200);
    expect(updatePayloads[0]?.topic).toBeNull();
  });

  it("only allows public or private visibility", async () => {
    const updatePayloads = mockRoomServer();

    await PATCH(patchRequest({ visibility: "not-a-visibility" }), mockContext("room-1"));
    expect(updatePayloads[0]?.visibility).toBe("public");

    await PATCH(patchRequest({ visibility: "private" }), mockContext("room-1"));
    expect(updatePayloads[1]?.visibility).toBe("private");
  });
});