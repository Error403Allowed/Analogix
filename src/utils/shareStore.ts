"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";

export interface DocumentShare {
  id: string;
  document_id: string;
  subject_id: string;
  owner_user_id: string;
  shared_with_user_id: string | null;
  share_link_id: string | null;
  permission: "view" | "edit";
  email: string | null;
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
  revoked: boolean;
  owner_name?: string;
  document_title?: string;
}

export interface SharedDocument {
  document_id: string;
  subject_id: string;
  owner_user_id: string;
  owner_name: string | null;
  permission: "view" | "edit";
  shared_at: string;
  document_title: string | null;
  document_data: any;
}

export interface CreateShareOptions {
  documentId: string;
  subjectId: string;
  permission: "view" | "edit";
  // For user-based sharing
  userId?: string;
  // For link-based sharing
  createLink?: boolean;
  // Optional expiration
  expiresAt?: string;
}

export interface ShareLink {
  id: string;
  shareId: string;
  url: string;
  permission: "view" | "edit";
  expiresAt: string | null;
  revoked: boolean;
}

const getUser = getAuthUser;

export const shareStore = {
  /**
   * Create a new share for a document
   */
  createShare: async (options: CreateShareOptions): Promise<DocumentShare> => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient();

    // Get the subject_data to find the owner
    const { data: subjectData, error: subjectError } = await supabase
      .from("subject_data")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("subject_id", options.subjectId)
      .single();

    if (subjectError || !subjectData) {
      throw new Error("Subject not found");
    }

    const shareData = {
      document_id: options.documentId,
      subject_id: options.subjectId,
      owner_user_id: subjectData.user_id,
      shared_with_user_id: options.userId || null,
      permission: options.permission,
      expires_at: options.expiresAt || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("document_shares")
      .insert(shareData)
      .select("*, owner_name:profiles(name)")
      .single();

    if (error) {
      console.error("[shareStore] createShare failed:", error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Create a shareable link for a document
   */
  createShareLink: async (
    documentId: string,
    subjectId: string,
    permission: "view" | "edit",
    expiresAt?: string
  ): Promise<ShareLink> => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient();

    // Get the subject_data to find the owner
    const { data: subjectData, error: subjectError } = await supabase
      .from("subject_data")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .single();

    if (subjectError || !subjectData) {
      throw new Error("Subject not found");
    }

    // Create the base share
    const { data: baseShare, error: baseError } = await supabase
      .from("document_shares")
      .insert({
        document_id: documentId,
        subject_id: subjectId,
        owner_user_id: subjectData.user_id,
        permission,
        expires_at: expiresAt || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (baseError) {
      console.error("[shareStore] createShareLink (base) failed:", baseError);
      throw new Error(baseError.message);
    }

    // Create linked shares for tracking
    // The share_link_id points to the base share for link-based access
    const shareLinkId = baseShare.id;

    // Generate a URL-friendly token (using the share ID)
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/shared/${shareLinkId}`;

    return {
      id: shareLinkId,
      shareId: baseShare.id,
      url,
      permission,
      expiresAt: expiresAt || null,
      revoked: baseShare.revoked,
    };
  },

  /**
   * Get all shares for a specific document (owner view)
   */
  getDocumentShares: async (
    documentId: string,
    subjectId: string
  ): Promise<DocumentShare[]> => {
    const user = await getUser();
    if (!user) return [];

    const supabase = createClient();

    const { data, error } = await supabase
      .from("document_shares")
      .select("*, owner_name:profiles(name)")
      .eq("document_id", documentId)
      .eq("subject_id", subjectId)
      .eq("owner_user_id", user.id)
      .eq("revoked", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[shareStore] getDocumentShares failed:", error);
      return [];
    }

    return data;
  },

  /**
   * Get all documents shared with the current user
   */
  getSharedWithMe: async (): Promise<SharedDocument[]> => {
    const user = await getUser();
    if (!user) return [];

    const supabase = createClient();

    // Use the RPC function
    const { data, error } = await supabase.rpc("get_shared_documents_for_user");

    if (error) {
      console.error("[shareStore] getSharedWithMe failed:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      document_id: item.document_id,
      subject_id: item.subject_id,
      owner_user_id: item.owner_user_id,
      owner_name: item.owner_name,
      permission: item.permission,
      shared_at: item.shared_at,
      document_title: item.document_title,
      document_data: item.document_data,
    }));
  },

  /**
   * Revoke a share
   */
  revokeShare: async (shareId: string): Promise<void> => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient();

    const { error } = await supabase
      .from("document_shares")
      .update({ revoked: true })
      .eq("id", shareId)
      .eq("owner_user_id", user.id);

    if (error) {
      console.error("[shareStore] revokeShare failed:", error);
      throw new Error(error.message);
    }
  },

  /**
   * Update share permission
   */
  updateSharePermission: async (
    shareId: string,
    permission: "view" | "edit"
  ): Promise<void> => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient();

    const { error } = await supabase
      .from("document_shares")
      .update({ permission })
      .eq("id", shareId)
      .eq("owner_user_id", user.id);

    if (error) {
      console.error("[shareStore] updateSharePermission failed:", error);
      throw new Error(error.message);
    }
  },

  /**
   * Access a document via share link
   */
  accessViaShareLink: async (shareLinkId: string): Promise<{
    success: boolean;
    share?: DocumentShare;
    document?: any;
    error?: string;
  }> => {
    const user = await getUser();
    const supabase = createClient();

    // Get the share record
    const { data: share, error: shareError } = await supabase
      .from("document_shares")
      .select("*")
      .eq("id", shareLinkId)
      .single();

    if (shareError || !share) {
      return { success: false, error: "Invalid share link" };
    }

    // Check if revoked or expired
    if (share.revoked) {
      return { success: false, error: "This share link has been revoked" };
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return { success: false, error: "This share link has expired" };
    }

    // Get the document data
    const { data: subjectData, error: docError } = await supabase
      .from("subject_data")
      .select("notes")
      .eq("user_id", share.owner_user_id)
      .eq("subject_id", share.subject_id)
      .single();

    if (docError || !subjectData) {
      return { success: false, error: "Document not found" };
    }

    // Find the specific document
    const documents = subjectData.notes?.documents || [];
    const document = documents.find(
      (d: any) => d.id === share.document_id
    );

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    return {
      success: true,
      share,
      document,
    };
  },

  /**
   * Check if current user has access to a document
   */
  hasAccess: async (
    documentId: string,
    subjectId: string,
    permission: "view" | "edit" = "view"
  ): Promise<boolean> => {
    const user = await getUser();
    if (!user) return false;

    const supabase = createClient();

    const { data, error } = await supabase.rpc("has_document_access", {
      p_document_id: documentId,
      p_subject_id: subjectId,
      p_permission: permission,
    });

    if (error) {
      console.error("[shareStore] hasAccess failed:", error);
      return false;
    }

    return data || false;
  },

  /**
   * Lookup user by email for sharing
   */
  lookupUserByEmail: async (email: string): Promise<{
    id: string;
    name: string | null;
    email: string;
  } | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = createClient();

    // Search profiles by email (via auth.users)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", user.id)
      .single();

    // Note: Direct email lookup requires admin privileges or a custom function
    // For now, we'll handle this in the API layer with proper permissions
    return null;
  },
};
