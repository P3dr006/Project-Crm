import { useState, useEffect, useCallback } from "react";
import { Users, Target, Percent, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Lead } from "../types/lead";
import { Navbar } from "../components/NavBar";
import { LeadTable } from "../components/leads/LeadTable";
import { LeadModal } from "../components/leads/LeadModal";
import type { LeadFormData } from "../components/leads/LeadModal";
import { DateRangeFilter } from "../components/dashboard/DateRangeFilter";
import { KpiCard } from "../components/dashboard/KpiCard";
import { LeadsLineChart } from "../components/dashboard/LeadsLineChart";
import { FunnelChart } from "../components/dashboard/FunnelChart";
import { SourcePieChart } from "../components/dashboard/SourcePieChart";

const PAGE_SIZE = 20;

const STATUSES = ["New", "In Progress", "Qualified", "Lost", "Converted", "No Response"];
const SOURCES  = ["Instagram", "WhatsApp", "Website", "Referral", "Other"];

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getCurrentMonthRange = () => {
  const now = new Date();
  return {
    start: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
    end:   toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState(getCurrentMonthRange());
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter.start && dateFilter.end) {
        params.set("start", dateFilter.start);
        params.set("end", dateFilter.end);
      }
      const response = await api.get(`/stats${params.size ? "?" + params : ""}`);
      setStats(response.data);
    } catch {
      console.warn("Failed to fetch dashboard stats — KPI cards will show 0");
    }
  }, [dateFilter]);

  const fetchLeads = useCallback(async (p = page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), size: String(PAGE_SIZE) });
      if (dateFilter.start && dateFilter.end) {
        params.set("start", dateFilter.start);
        params.set("end", dateFilter.end);
      }
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      const response = await api.get(`/leads?${params}`);
      setLeads(response.data.leads || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
    } catch {
      toast.error("Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, statusFilter, sourceFilter, page]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [dateFilter, statusFilter, sourceFilter]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchLeads(page)]);
  }, [dateFilter, statusFilter, sourceFilter, page]);

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted successfully!");
      Promise.all([fetchLeads(page), fetchStats()]);
    } catch {
      toast.error("Failed to delete lead.");
    }
  };

  const handleSaveLead = async (data: LeadFormData) => {
    try {
      if (editingLead) {
        await api.patch(`/leads/${editingLead.id}`, data);
        toast.success("Lead updated successfully!");
      } else {
        await api.post("/leads", data);
        toast.success("Lead created successfully!");
      }
      setIsModalOpen(false);
      Promise.all([fetchLeads(page), fetchStats()]);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to save lead.";
      toast.error(message);
      throw error;
    }
  };

  const hasActiveFilters = statusFilter || sourceFilter;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Navbar />

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

        {/* HEADER + DATE FILTER */}
        <div className="sm:flex sm:items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Performance Dashboard</h2>
            <p className="mt-1 text-sm text-gray-500">Track your sales funnel and lead generation metrics.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <DateRangeFilter onFilterChange={(start, end) => setDateFilter({ start, end })} />
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <KpiCard title="Total Leads" value={stats?.kpis.total || 0} icon={<Users size={24} />} />
          <KpiCard title="Converted" value={stats?.kpis.converted || 0} icon={<Target size={24} />} />
          <KpiCard title="Conversion Rate" value={`${stats?.kpis.conversion_rate || 0}%`} icon={<Percent size={24} />} trend="Current" trendUp={true} />
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <LeadsLineChart data={stats?.chart || []} />
          <FunnelChart data={stats?.funnel || []} />
          <SourcePieChart data={stats?.sources || []} />
        </div>

        {/* LEADS TABLE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Leads Pipeline</h2>
            <p className="mt-1 text-sm text-gray-500">
              {total} lead{total !== 1 ? "s" : ""} found
            </p>
          </div>
          <button
            onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
          >
            Add Lead
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => { setStatusFilter(""); setSourceFilter(""); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        <LeadTable leads={leads} isLoading={isLoading} onEdit={handleOpenEditModal} onDelete={handleDelete} />

        {/* PAGINATION */}
        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-gray-700 font-medium px-2">{page} / {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveLead} editingLead={editingLead} />
    </div>
  );
}
