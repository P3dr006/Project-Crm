import { useState, useEffect, useCallback } from "react";
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
import { Calendar, ChevronDown } from "lucide-react";

const STATUSES = ["New", "In Progress", "Qualified", "Lost", "Converted"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  "New":          "bg-blue-500",
  "In Progress":  "bg-yellow-500",
  "Qualified":    "bg-indigo-500",
  "Lost":         "bg-red-500",
  "Converted":    "bg-green-500",
};

// Calculates start/end dates in the user's local timezone based on the selected filter
const getDateRange = (filter: string) => {
  const today = new Date();
  const start = new Date();

  if (filter === "week") {
    start.setDate(today.getDate() - 7);
  } else if (filter === "month") {
    start.setMonth(today.getMonth() - 1);
  } else if (filter === "year") {
    start.setFullYear(today.getFullYear() - 1);
  } else if (filter !== "today") {
    return { start_date: null, end_date: null };
  }

  return {
    start_date: start.toISOString().split("T")[0],
    end_date: today.toISOString().split("T")[0],
  };
};

export function Kanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  
  const [timeFilter, setTimeFilter] = useState("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start_date, end_date } = getDateRange(timeFilter);
      let url = "/leads?size=100";
      if (start_date && end_date) {
        url += `&start=${start_date}&end=${end_date}`;
      }
      const response = await api.get(url);
      setLeads(response.data.leads || []);
    } catch {
      toast.error("Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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

    // Optimistic update
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="py-8 px-6 flex-1 flex flex-col overflow-hidden max-w-[1600px] w-full mx-auto">
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Leads Pipeline</h2>
              <p className="mt-1 text-sm text-gray-500">
                Drag and drop cards to update status instantly.
              </p>
            </div>

            <div className="relative group inline-block w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="block w-full sm:w-48 appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-10 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">This Year</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
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
              <div className="flex gap-5 overflow-x-auto pb-6 flex-1 items-start">
                {STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    leads={leadsByStatus(status)}
                    dotColor={STATUS_COLORS[status]}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeLead && (
                  <div className="rotate-2 opacity-90 shadow-xl cursor-grabbing">
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