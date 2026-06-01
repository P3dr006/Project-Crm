export interface Contact {
  id: string;
  workspace_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  source: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
