import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Lead } from "../../types/lead";

const leadSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone must be at least 8 characters"),
  status: z.enum(['New', 'Contacted', 'In Progress', 'Qualified', 'Lost', 'Converted']),
});

export type LeadFormData = z.infer<typeof leadSchema>;

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LeadFormData) => Promise<void>;
  editingLead: Lead | null;
}

export function LeadModal({ isOpen, onClose, onSave, editingLead }: LeadModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "New" }
  });

  // Atualiza os dados do formulário quando o modal abre para edição
  useEffect(() => {
    if (editingLead) {
      reset({
        full_name: editingLead.full_name,
        email: editingLead.email || "",
        phone: editingLead.phone,
        status: editingLead.status
      });
    } else {
      reset({ full_name: "", email: "", phone: "", status: "New" });
    }
  }, [editingLead, reset, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-20">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingLead ? "Edit Lead" : "Add New Lead"}
        </h3>
        
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" {...register("full_name")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.full_name && <span className="text-red-500 text-xs mt-1">{errors.full_name.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
            <input type="email" {...register("email")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input type="text" {...register("phone")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select {...register("status")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white">
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="In Progress">In Progress</option>
              <option value="Qualified">Qualified</option>
              <option value="Lost">Lost</option>
              <option value="Converted">Converted</option>
            </select>
          </div>

          <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:col-start-1 sm:mt-0 sm:text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 sm:col-start-2 sm:text-sm">
              {isSubmitting ? "Saving..." : (editingLead ? "Save Changes" : "Save Lead")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}