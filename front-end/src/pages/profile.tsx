import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navbar } from "../components/NavBar";
import { User, Mail, Calendar, Building, Shield, CheckCircle2, Zap } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function Profile() {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name || "" }
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await api.patch("/users/me", data);
      updateUser({ full_name: response.data.full_name });
      
      toast.success("Profile updated successfully! ✨");
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile.");
    }
  };

  // Dinâmica de cores baseada no plano e cargo
  const planColors: Record<string, string> = {
    Bronze: "bg-orange-100 text-orange-800 border-orange-200",
    Silver: "bg-gray-100 text-gray-800 border-gray-200",
    Gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const currentPlan = user?.plan || "Bronze";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />

      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your personal information and workspace details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: PROFILE & WORKSPACE (Takes up 2/3 of the space) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CARD 1: PERSONAL INFO */}
            <div className="bg-white shadow-sm sm:rounded-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-5 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Personal Information
                </h3>
              </div>
              
              <div className="px-6 py-6">
                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Full Name</span>
                      <span className="block text-base font-medium text-gray-900 mt-1">{user?.full_name}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Mail className="w-4 h-4" /> Email Address
                      </span>
                      <span className="block text-base text-gray-900 mt-1">{user?.email}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> Member Since
                      </span>
                      <span className="block text-base text-gray-900 mt-1">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "—"}
                      </span>
                    </div>
                    
                    <div className="sm:col-span-2 pt-4 border-t border-gray-50 mt-2">
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Edit Profile Information
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        {...register("full_name")}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 transition-shadow"
                      />
                      {errors.full_name && <span className="text-red-500 text-xs mt-1 block">{errors.full_name.message}</span>}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* CARD 2: WORKSPACE & ROLE */}
            <div className="bg-white shadow-sm sm:rounded-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-5 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-500" />
                  Workspace Details
                </h3>
              </div>
              <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="block text-sm font-medium text-gray-500">Workspace ID</span>
                  <span className="block text-sm font-mono text-gray-600 mt-1 bg-gray-50 p-2 rounded border border-gray-100 truncate">
                    {user?.workspace_id || "Not assigned"}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Shield className="w-4 h-4" /> Your Access Role
                  </span>
                  <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize border border-indigo-200">
                    {user?.role || "Employee"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PLAN & BILLING (Takes up 1/3 of the space) */}
          <div className="space-y-6">
            <div className="bg-white shadow-sm sm:rounded-xl border border-gray-100 overflow-hidden relative">
              {/* Decorative top border */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500 absolute top-0 left-0"></div>
              
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${planColors[currentPlan] || planColors.Bronze}`}>
                    {currentPlan} Tier
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-6">
                  {currentPlan === "Bronze" 
                    ? "Perfect for solo entrepreneurs and independent managers." 
                    : "Powerful features for managing your entire sales team."}
                </p>

                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Plan Features</h4>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                      <span>Unlimited CRM Leads</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                      <span>Interactive Pipeline Dashboard</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                      <span>
                        {currentPlan === "Bronze" && "Single-user access"}
                        {currentPlan === "Silver" && "Up to 3 team members (1 Manager + 2 Workers)"}
                        {currentPlan === "Gold" && "Up to 6 team members (1 Manager + 5 Workers)"}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <button 
                    disabled={currentPlan === "Gold"}
                    className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2.5 text-sm font-medium text-white shadow hover:from-gray-800 hover:to-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4" />
                    {currentPlan === "Gold" ? "Max Tier Reached" : "Upgrade Plan"}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}