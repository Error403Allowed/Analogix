import DataLoader from "dataloader";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DataLoaders {
  profileById: DataLoader<string, Record<string, unknown> | null>;
  documentsById: DataLoader<string, Record<string, unknown> | null>;
  roomMembersByRoomId: DataLoader<string, Record<string, unknown>[]>;
  roomSharedDocumentsByRoomId: DataLoader<string, Record<string, unknown>[]>;
}

export function createDataLoaders(supabase: SupabaseClient): DataLoaders {
  return {
    profileById: new DataLoader(async (ids: readonly string[]) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", ids as string[]);
      const map = new Map((data ?? []).map((p) => [p.id, p]));
      return ids.map((id) => map.get(id) ?? null);
    }),

    documentsById: new DataLoader(async (ids: readonly string[]) => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .in("id", ids as string[]);
      const map = new Map((data ?? []).map((d) => [d.id, d]));
      return ids.map((id) => map.get(id) ?? null);
    }),

    roomMembersByRoomId: new DataLoader(async (roomIds: readonly string[]) => {
      const { data } = await supabase
        .from("study_room_members")
        .select("*")
        .in("room_id", roomIds as string[]);
      const map = new Map<string, Record<string, unknown>[]>();
      for (const member of data ?? []) {
        const list = map.get(member.room_id) ?? [];
        list.push(member);
        map.set(member.room_id, list);
      }
      return roomIds.map((id) => map.get(id) ?? []);
    }),

    roomSharedDocumentsByRoomId: new DataLoader(async (roomIds: readonly string[]) => {
      const { data } = await supabase
        .from("study_room_shared_documents")
        .select("*")
        .in("room_id", roomIds as string[]);
      const map = new Map<string, Record<string, unknown>[]>();
      for (const doc of data ?? []) {
        const list = map.get(doc.room_id) ?? [];
        list.push(doc);
        map.set(doc.room_id, list);
      }
      return roomIds.map((id) => map.get(id) ?? []);
    }),
  };
}
