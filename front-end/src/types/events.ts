export interface Event {
  id: string;
  workspace_id: string;
  created_by: string;
  assigned_to: string;
  lead_id?: string | null;
  type: "meeting" | "callback";
  title: string;
  notes?: string | null;
  scheduled_at: string;
  status: "pending" | "done" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  title: string;
  scheduled_at: string;
  type?: "meeting" | "callback";
  assigned_to?: string | null;
  lead_id?: string | null;
  notes?: string | null;
}