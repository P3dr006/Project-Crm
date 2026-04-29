import type { Lead } from "../../types/lead";

export const StatusBadge = ({ status }: { status: Lead['status'] }) => {
  const styles: Record<string, string> = {
    'New': "bg-blue-100 text-blue-800",
    'Contacted': "bg-purple-100 text-purple-800",
    'In Progress': "bg-yellow-100 text-yellow-800",
    'Qualified': "bg-indigo-100 text-indigo-800",
    'Lost': "bg-red-100 text-red-800",
    'Converted': "bg-green-100 text-green-800",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};