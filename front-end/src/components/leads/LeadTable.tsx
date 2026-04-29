import type { Lead } from "../../types/lead";
import { StatusBadge } from "./StatusBadge";

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
}

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="whitespace-nowrap px-3 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
    <td className="whitespace-nowrap px-3 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
    <td className="whitespace-nowrap px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
    <td className="whitespace-nowrap px-3 py-4"><div className="h-5 bg-gray-200 rounded-full w-20"></div></td>
    <td className="whitespace-nowrap px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
    <td className="whitespace-nowrap px-3 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></td>
  </tr>
);

export function LeadTable({ leads, isLoading, onEdit, onDelete }: LeadTableProps) {
  return (
    <div className="mt-8 flex flex-col">
      <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg bg-white">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500">
                      No leads found. Click "Add Lead" to get started!
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition">
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">{lead.full_name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{lead.email || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{lead.phone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => onEdit(lead)} className="text-blue-600 hover:text-blue-900 mr-4 transition">Edit</button>
                        <button onClick={() => onDelete(lead.id)} className="text-red-600 hover:text-red-900 transition">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}