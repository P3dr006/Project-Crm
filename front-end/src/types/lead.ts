export interface Lead {
  id: number;
  workspace_id: string;
  assigned_to?: string | null;
  full_name: string;
  phone: string;
  email?: string;
  status: 'New' | 'In Progress' | 'Qualified' | 'Lost' | 'Converted';
  source: 'Instagram' | 'WhatsApp' | 'Website' | 'Referral' | 'Other';
  next_contact_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}