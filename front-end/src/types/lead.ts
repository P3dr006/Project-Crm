export interface Lead {
  id: number;
  full_name: string;
  email?: string;
  phone: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Qualified' | 'Lost' | 'Converted';
  created_at: string;
}