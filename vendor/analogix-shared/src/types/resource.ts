export type ResourceType = "pdf" | "docx" | "pptx" | "image" | "text" | "other";

export interface Resource {
  id: string;
  user_id: string;
  subject_id?: string | null;
  name: string;
  type: ResourceType;
  mime_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url?: string | null;
  created_at: string;
}
