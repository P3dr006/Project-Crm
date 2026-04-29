import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// --- INTERFACES & SCHEMAS ---

interface Lead {
  id: number;
  full_name: string;
  email?: string;
  phone: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Qualified' | 'Lost' | 'Converted';
  created_at: string;
}

const leadSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone must be at least 8 characters"),
  status: z.enum(['New', 'Contacted', 'In Progress', 'Qualified', 'Lost', 'Converted']),
});

type LeadFormData = z.infer<typeof leadSchema>;

// --- COMPONENTES DE UI ---

const StatusBadge = ({ status }: { status: Lead['status'] }) => {
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

// --- DASHBOARD PRINCIPAL ---

export function Dashboard() {
  const { user, logout } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Controle do Modal e de Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "New" }
  });

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

  // --- FUNÇÕES DE CRUD ---

  const handleOpenCreateModal = () => {
    setEditingLead(null);
    reset({ full_name: "", email: "", phone: "", status: "New" }); // Limpa o form
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    // Preenche o formulário com os dados do lead clicado
    reset({
      full_name: lead.full_name,
      email: lead.email || "",
      phone: lead.phone,
      status: lead.status
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      // Se tivermos um editingLead, fazemos PUT. Se não, POST.
      if (editingLead) {
        await api.patch(`/leads/${editingLead.id}`, data);
        toast.success("Lead updated successfully! 📝");
      } else {
        await api.post("/leads", data);
        toast.success("Lead created successfully! 🎉");
      }
      closeModal();
      fetchLeads();
    } catch (error) {
      console.error(error);
      toast.error(editingLead ? "Failed to update lead." : "Failed to create lead.");
    }
  };

  const handleDelete = async (id: number) => {
    // Alerta de segurança antes de apagar do banco
    if (!window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted successfully! 🗑️");
      fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead.");
    }
  };

  // --- RENDERIZAÇÃO ---

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <nav className="bg-white border-b border-gray-200 p-4 flex justify-between items-center px-8">
        <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Orbit Dash</h1>
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-500">
            Logged in as <strong className="text-gray-900">{user?.full_name}</strong>
          </span>
          <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-500 transition">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold text-gray-900">Leads Pipeline</h2>
            <p className="mt-2 text-sm text-gray-700">Manage your potential customers and track their status.</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={handleOpenCreateModal} // Usando a nova função
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none transition"
            >
              Add Lead
            </button>
          </div>
        </div>

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
                            {/* BOTOES DE EDITAR E DELETAR CONECTADOS AQUI */}
                            <button 
                              onClick={() => handleOpenEditModal(lead)}
                              className="text-blue-600 hover:text-blue-900 mr-4 transition"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(lead.id)}
                              className="text-red-600 hover:text-red-900 transition"
                            >
                              Delete
                            </button>
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
      </main>

      {/* --- MODAL REUTILIZÁVEL (CREATE E UPDATE) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" 
            onClick={closeModal}
          ></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-20">
            {/* Título dinâmico baseado no estado */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingLead ? "Edit Lead" : "Add New Lead"}
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input 
                  type="text" 
                  {...register("full_name")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
                {errors.full_name && <span className="text-red-500 text-xs mt-1">{errors.full_name.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                <input 
                  type="email" 
                  {...register("email")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
                {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input 
                  type="text" 
                  {...register("phone")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
                {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select 
                  {...register("status")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Lost">Lost</option>
                  <option value="Converted">Converted</option>
                </select>
              </div>

              <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:col-start-1 sm:mt-0 sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 sm:col-start-2 sm:text-sm"
                >
                  {/* Botão dinâmico */}
                  {isSubmitting ? "Saving..." : (editingLead ? "Save Changes" : "Save Lead")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}