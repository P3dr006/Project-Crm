import { useState, useEffect } from "react";
import { Users, Target, Percent } from "lucide-react";
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

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const fetchStats = async () => {
    try {
      let url = "/stats";
      if (dateFilter.start && dateFilter.end) {
        url += `?start=${dateFilter.start}&end=${dateFilter.end}`;
      }
      const response = await api.get(url);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/leads");
      setLeads(response.data.leads || response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFilter]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted successfully!");
      fetchLeads();
      fetchStats();
    } catch (error) {
      console.error("Error deleting lead:", error);
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
      fetchLeads();
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error(editingLead ? "Failed to update lead." : "Failed to create lead.");
      throw error;
    }
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <LeadsLineChart data={stats?.chart || []} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FunnelChart data={stats?.funnel || []} />
            <SourcePieChart data={stats?.sources || []} />
          </div>
        </div>

        {/* LEADS TABLE */}
        <div className="sm:flex sm:items-center mb-4">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">Leads Pipeline</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your potential customers and track their status.</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none transition"
            >
              Add Lead
            </button>
          </div>
        </div>

        <LeadTable leads={leads} isLoading={isLoading} onEdit={handleOpenEditModal} onDelete={handleDelete} />
      </main>

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveLead} editingLead={editingLead} />
    </div>
  );
}