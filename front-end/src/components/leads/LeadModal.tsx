import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Phone, Mail, UserPlus, Users, AlertTriangle } from "lucide-react";
import { api } from "../../services/api";
import type { Lead } from "../../types/lead";
import type { Contact } from "../../types/contact";

const toLocalInput = (d: Date) => {
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

const leadSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.union([z.email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().min(8, "Phone must be at least 8 characters"),
  status: z.enum(["New", "In Progress", "Qualified", "Lost", "Converted", "No Response"]),
  source: z.enum(["Instagram", "WhatsApp", "Website", "Referral", "Other"]),
  notes: z.string().optional(),
  next_contact_date: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export type LeadFormData = {
  full_name: string;
  phone: string;
  email?: string;
  status: "New" | "In Progress" | "Qualified" | "Lost" | "Converted" | "No Response";
  source: "Instagram" | "WhatsApp" | "Website" | "Referral" | "Other";
  notes?: string;
  next_contact_date?: string;
};

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LeadFormData) => Promise<void>;
  editingLead: Lead | null;
  prefillContact?: Contact | null;
}

export function LeadModal({ isOpen, onClose, onSave, editingLead, prefillContact }: LeadModalProps) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [duplicateContact, setDuplicateContact] = useState<Contact | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "New", source: "Other" },
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMode("new");
      setSearch("");
      setSelectedContact(null);
      setDuplicateContact(null);
      return;
    }

    if (editingLead) {
      reset({
        full_name: editingLead.full_name,
        email: editingLead.email || "",
        phone: editingLead.phone,
        status: editingLead.status,
        source: editingLead.source,
        notes: editingLead.notes || "",
        next_contact_date: editingLead.next_contact_date
          ? toLocalInput(new Date(editingLead.next_contact_date))
          : "",
      });
    } else if (prefillContact) {
      reset({
        full_name: prefillContact.full_name,
        email: prefillContact.email || "",
        phone: prefillContact.phone || "",
        status: "New",
        source: (prefillContact.source as LeadFormData["source"]) || "Other",
        notes: "",
        next_contact_date: "",
      });
    } else {
      reset({ full_name: "", email: "", phone: "", status: "New", source: "Other", notes: "", next_contact_date: "" });
    }
  }, [editingLead, prefillContact, reset, isOpen]);

  // Fetch last 10 contacts on tab open; re-fetch with search when user types
  useEffect(() => {
    if (mode !== "existing") return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ size: search ? "20" : "10" });
      if (search) params.set("search", search);
      api.get(`/contacts?${params}`)
        .then((res) => setContacts(res.data.contacts ?? []))
        .catch(() => {});
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [mode, search]);

  // Pre-fill form when a contact is selected in "existing" tab
  useEffect(() => {
    if (selectedContact) {
      reset({
        full_name: selectedContact.full_name,
        email: selectedContact.email || "",
        phone: selectedContact.phone || "",
        status: "New",
        source: (selectedContact.source as LeadFormData["source"]) || "Other",
        notes: "",
        next_contact_date: "",
      });
    }
  }, [selectedContact, reset]);

  // Duplicate check — debounced 600ms, only in "new client" mode
  const watchedPhone = watch("phone");
  const watchedEmail = watch("email");

  useEffect(() => {
    if (mode !== "new" || editingLead || prefillContact) return;
    setDuplicateContact(null);

    const phone = watchedPhone?.trim();
    const email = watchedEmail?.trim();
    if (!phone || phone.length < 8) return;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (phone) params.set("phone", phone);
        if (email && email.includes("@")) params.set("email", email);
        const res = await api.get(`/contacts/check?${params}`);
        if (res.data?.id) setDuplicateContact(res.data as Contact);
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [watchedPhone, watchedEmail, mode, editingLead, prefillContact]);

  // contacts already filtered/paginated by the server
  const filteredContacts = contacts;

  const onSubmit = (values: LeadFormValues) => {
    return onSave({
      ...values,
      email: values.email || undefined,
      notes: values.notes || undefined,
      next_contact_date: values.next_contact_date
        ? new Date(values.next_contact_date).toISOString()
        : undefined,
    });
  };

  if (!isOpen) return null;

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2";
  const isEditing = !!editingLead;
  const isPrefill = !!prefillContact;

  const title = isEditing
    ? "Edit Lead"
    : isPrefill
    ? `New Deal — ${prefillContact.full_name}`
    : mode === "existing" && selectedContact
    ? `New Lead — ${selectedContact.full_name}`
    : "Add New Lead";

  const saveLabel = isEditing
    ? "Save Changes"
    : isPrefill || (mode === "existing" && selectedContact)
    ? "Create Deal"
    : "Save Lead";

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-20 max-h-[90vh] overflow-y-auto">

        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

        {/* DUPLICATE WARNING — shown in "new client" mode when phone/email matches an existing contact */}
        {mode === "new" && duplicateContact && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-800">Contact already exists</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                <span className="font-semibold">{duplicateContact.full_name}</span> is already registered with this phone or email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedContact(duplicateContact); setMode("existing"); setDuplicateContact(null); }}
              className="text-xs font-medium text-yellow-800 underline hover:text-yellow-900 whitespace-nowrap"
            >
              Use existing
            </button>
          </div>
        )}

        {/* TABS — only shown when adding (not editing or prefill from Clients) */}
        {!isEditing && !isPrefill && (
          <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode("new"); setSelectedContact(null); setSearch(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserPlus className="w-4 h-4" /> New Client
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "existing" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4" /> Existing Client
            </button>
          </div>
        )}

        {/* EXISTING CLIENT — search + contact list */}
        {mode === "existing" && !selectedContact && (
          <div className="mb-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {contacts.length === 0 ? "Loading..." : "No clients found."}
                </p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContact(contact)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <p className="text-sm font-semibold text-gray-900">{contact.full_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {contact.phone && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* SELECTED CONTACT — info card before the form */}
        {mode === "existing" && selectedContact && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">{selectedContact.full_name}</p>
              <p className="text-xs text-blue-600 mt-0.5">{selectedContact.phone} {selectedContact.email ? `· ${selectedContact.email}` : ""}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedContact(null); reset({ status: "New", source: "Other", full_name: "", phone: "", email: "", notes: "", next_contact_date: "" }); }}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Change
            </button>
          </div>
        )}

        {/* FORM — shown in "new" mode always, or in "existing" only after contact selected */}
        {(mode === "new" || selectedContact || isEditing || isPrefill) && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Contact fields hidden in "existing" mode (data comes from selected contact) */}
            {(mode === "new" || isEditing || isPrefill) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" {...register("full_name")} className={inputClass} />
                  {errors.full_name && <span className="text-red-500 text-xs mt-1">{errors.full_name.message}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input type="text" {...register("phone")} className={inputClass} />
                  {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone.message}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="email" {...register("email")} className={inputClass} />
                  {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select {...register("status")} className={`${inputClass} bg-white`}>
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Lost">Lost</option>
                  <option value="Converted">Converted</option>
                  <option value="No Response">No Response</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <select {...register("source")} className={`${inputClass} bg-white`}>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Schedule Callback <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="datetime-local" {...register("next_contact_date")} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Any relevant information about this lead..."
              />
            </div>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : saveLabel}
              </button>
            </div>
          </form>
        )}

        {/* No contact selected yet in "existing" mode — show cancel only */}
        {mode === "existing" && !selectedContact && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
