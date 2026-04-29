import { useEffect, useState } from "react";
import { api } from "../services/api";
import { toast } from "sonner";
import type { Lead } from "../types/lead";
import { Navbar } from "../components/NavBar";
import { LeadTable } from "../components/leads/LeadTable";
import { LeadModal } from "../components/leads/LeadModal";
import type { LeadFormData } from "../components/leads/LeadModal";

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

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
    fetchLeads();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingLead(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted successfully! 🗑️");
      fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead.");
    }
  };

  const handleSaveLead = async (data: LeadFormData) => {
    try {
      if (editingLead) {
        await api.patch(`/leads/${editingLead.id}`, data);
        toast.success("Lead updated successfully! 📝");
      } else {
        await api.post("/leads", data);
        toast.success("Lead created successfully! 🎉");
      }
      setIsModalOpen(false);
      fetchLeads();
    } catch (error) {
      console.error(error);
      toast.error(editingLead ? "Failed to update lead." : "Failed to create lead.");
      throw error; // Repassa o erro para o form parar o loading
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Navbar />

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">Leads Pipeline</h2>
            <p className="mt-2 text-sm text-gray-700">Manage your potential customers and track their status.</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none transition"
            >
              Add Lead
            </button>
          </div>
        </div>

        <LeadTable 
          leads={leads} 
          isLoading={isLoading} 
          onEdit={handleOpenEditModal} 
          onDelete={handleDelete} 
        />
      </main>

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveLead} 
        editingLead={editingLead} 
      />
    </div>
  );
}