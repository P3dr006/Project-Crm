import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Lead } from "../types/lead";
import { Navbar } from "../components/NavBar";
import { KanbanColumn } from "../components/kanban/KanbanColumn";
import { KanbanCard } from "../components/kanban/KanbanCard";

const STATUSES = ["New", "In Progress", "Qualified", "Lost", "Converted"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  "New":          "bg-blue-500",
  "In Progress":  "bg-yellow-500",
  "Qualified":    "bg-indigo-500",
  "Lost":         "bg-red-500",
  "Converted":    "bg-green-500",
};

export function Kanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/leads?size=100");
      setLeads(response.data.leads || []);
    } catch {
      toast.error("Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as Status;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update — feels instant to the user
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      await api.patch(`/leads/${leadId}`, { status: newStatus });
      toast.success(`Moved to "${newStatus}"`);
    } catch {
      // Revert if the request failed
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l))
      );
      toast.error("Failed to update lead status.");
    }
  };

  const leadsByStatus = (status: Status) =>
    leads.filter((l) => l.status === status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="py-8 px-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Leads Pipeline</h2>
          <p className="mt-1 text-sm text-gray-500">
            Drag and drop cards between columns to update lead status instantly.
          </p>
        </div>

        {isLoading ? (
          <div className="flex gap-5">
            {STATUSES.map((s) => (
              <div key={s} className="w-64 h-72 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-5 overflow-x-auto pb-6">
              {STATUSES.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  leads={leadsByStatus(status)}
                  dotColor={STATUS_COLORS[status]}
                />
              ))}
            </div>

            {/* Ghost card shown while dragging */}
            <DragOverlay>
              {activeLead && (
                <div className="rotate-2 opacity-90 shadow-xl">
                  <KanbanCard lead={activeLead} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>
    </div>
  );
}
