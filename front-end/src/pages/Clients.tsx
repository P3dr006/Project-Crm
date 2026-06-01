import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { Navbar } from "../components/NavBar";
import { LeadModal } from "../components/leads/LeadModal";
import { Users, Phone, Mail, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "../types/contact";
import type { LeadFormData } from "../components/leads/LeadModal";

const PAGE_SIZE = 20;

export function Clients() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefillContact, setPrefillContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async (p: number, q: string) => {
    try {
      const params = new URLSearchParams({ page: String(p), size: String(PAGE_SIZE) });
      if (q) params.set("search", q);
      const res = await api.get(`/contacts?${params}`);
      setContacts(res.data.contacts);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error("Failed to load clients.");
    }
  }, []);

  // Debounce search — wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchContacts(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  useEffect(() => {
    fetchContacts(page, search);
  }, [page, fetchContacts]);

  const handleNewDeal = (contact: Contact) => {
    setPrefillContact(contact);
    setIsModalOpen(true);
  };

  const handleSaveLead = async (data: LeadFormData) => {
    await api.post("/leads", data);
    toast.success("New deal created successfully!");
    setIsModalOpen(false);
    setPrefillContact(null);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setPrefillContact(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Clients</h2>
            <p className="mt-1 text-sm text-gray-500">
              {total} contact{total !== 1 ? "s" : ""} in your workspace
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-80"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-600 font-bold text-sm">
                    {contact.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {contact.source}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-2 truncate">{contact.full_name}</h3>

              {contact.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Phone className="w-3 h-3 shrink-0" /> {contact.phone}
                </p>
              )}
              {contact.email && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" /> {contact.email}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Since {new Date(contact.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>

              <button
                onClick={() => handleNewDeal(contact)}
                className="mt-auto w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Deal
              </button>
            </div>
          ))}

          {contacts.length === 0 && (
            <div className="col-span-full text-center py-24 flex flex-col items-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No clients found.</p>
              <p className="text-xs text-gray-400 mt-1">
                Clients are created automatically when you add a lead.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
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
              <span className="text-sm text-gray-700 font-medium px-2">
                {page} / {pages}
              </span>
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

      <LeadModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={handleSaveLead}
        editingLead={null}
        prefillContact={prefillContact}
      />
    </div>
  );
}
