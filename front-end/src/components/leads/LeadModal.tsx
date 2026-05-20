import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Lead } from "../../types/lead";

// Schema validates form inputs — no transforms so the resolver type stays clean
const leadSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.union([z.email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().min(8, "Phone must be at least 8 characters"),
  status: z.enum(["New", "In Progress", "Qualified", "Lost", "Converted"]),
  source: z.enum(["Instagram", "WhatsApp", "Website", "Referral", "Other"]),
  notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

// Clean type sent to the API — empty strings collapsed to undefined
export type LeadFormData = {
  full_name: string;
  phone: string;
  email?: string;
  status: "New" | "In Progress" | "Qualified" | "Lost" | "Converted";
  source: "Instagram" | "WhatsApp" | "Website" | "Referral" | "Other";
  notes?: string;
};

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LeadFormData) => Promise<void>;
  editingLead: Lead | null;
}

export function LeadModal({ isOpen, onClose, onSave, editingLead }: LeadModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "New", source: "Other" },
  });

  useEffect(() => {
    if (editingLead) {
      reset({
        full_name: editingLead.full_name,
        email: editingLead.email || "",
        phone: editingLead.phone,
        status: editingLead.status,
        source: editingLead.source,
        notes: editingLead.notes || "",
      });
    } else {
      reset({ full_name: "", email: "", phone: "", status: "New", source: "Other", notes: "" });
    }
  }, [editingLead, reset, isOpen]);

  const onSubmit = (values: LeadFormValues) => {
    return onSave({
      ...values,
      email: values.email || undefined,
      notes: values.notes || undefined,
    });
  };

  if (!isOpen) return null;

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2";

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-20 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingLead ? "Edit Lead" : "Add New Lead"}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select {...register("status")} className={`${inputClass} bg-white`}>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Qualified">Qualified</option>
                <option value="Lost">Lost</option>
                <option value="Converted">Converted</option>
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
              {isSubmitting ? "Saving..." : editingLead ? "Save Changes" : "Save Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
