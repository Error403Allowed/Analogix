export type DocumentRole = "notes" | "study-guide" | "shared";

export interface Document {
  id: string;
  owner_user_id: string;
  subject_id: string;
  title: string;
  content: string;
  content_json?: string | null;
  content_text?: string | null;
  content_format?: string | null;
  role?: DocumentRole;
  icon?: string | null;
  cover?: string | null;
  created_at: string;
  updated_at: string;
  last_edited_by?: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: string;
  content_json?: string | null;
  content_text?: string | null;
  created_at: string;
  created_by: string;
}
