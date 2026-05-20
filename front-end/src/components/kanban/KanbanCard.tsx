import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "../../types/lead";

const SOURCE_COLORS: Record<string, string> = {
  Instagram:  "bg-pink-100 text-pink-700",
  WhatsApp:   "bg-green-100 text-green-700",
  Website:    "bg-blue-100 text-blue-700",
  Referral:   "bg-purple-100 text-purple-700",
  Other:      "bg-gray-100 text-gray-600",
};

export function KanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging
          ? "opacity-40 shadow-lg border-blue-300"
          : "border-gray-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      <p className="font-semibold text-gray-900 text-sm truncate">{lead.full_name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>

      {lead.email && (
        <p className="text-xs text-gray-400 truncate mt-0.5">{lead.email}</p>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[lead.source] || SOURCE_COLORS.Other}`}>
          {lead.source}
        </span>
        {lead.created_at && (
          <span className="text-xs text-gray-400">
            {new Date(lead.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
