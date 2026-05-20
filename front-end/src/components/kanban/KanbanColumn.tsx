import { useDroppable } from "@dnd-kit/core";
import type { Lead } from "../../types/lead";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  status: string;
  leads: Lead[];
  dotColor: string;
}

export function KanbanColumn({ status, leads, dotColor }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-68 shrink-0" style={{ minWidth: "272px" }}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className="font-semibold text-gray-800 text-sm">{status}</h3>
        </div>
        <span className="text-xs bg-gray-200 text-gray-600 font-medium px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-48 rounded-xl p-2 transition-colors duration-150 ${
          isOver
            ? "bg-blue-50 border-2 border-blue-300 border-dashed"
            : "bg-gray-100/70 border-2 border-transparent"
        }`}
      >
        {leads.length === 0 && !isOver && (
          <p className="text-xs text-gray-400 text-center mt-6 select-none">
            Drop leads here
          </p>
        )}
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
