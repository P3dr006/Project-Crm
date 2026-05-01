import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navbar } from "../components/NavBar";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your profile and subscription plan.</p>
        </div>

        <div className="space-y-6">
          {/* CARD 1: USER PROFILE */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Personal Information</h3>
              
              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Full Name</span>
                    <span className="block text-base text-gray-900 mt-1">{user?.full_name}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Email Address</span>
                    <span className="block text-base text-gray-900 mt-1">{user?.email}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Member Since</span>
                    <span className="block text-base text-gray-900 mt-1">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      Edit Name
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      {...register("full_name")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                    {errors.full_name && <span className="text-red-500 text-xs mt-1">{errors.full_name.message}</span>}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* CARD 2: SUBSCRIPTION PLAN */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Current Plan</h3>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-0.5 text-sm font-medium text-orange-800">
                  🥉 Bronze Tier
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                You are currently on the free Bronze tier. This plan is perfect for individuals getting started.
              </p>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Limitations</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="text-red-500 mr-2">✗</span> Up to 50 active leads
                  </li>
                  <li className="flex items-center">
                    <span className="text-red-500 mr-2">✗</span> Single user access
                  </li>
                  <li className="flex items-center">
                    <span className="text-red-500 mr-2">✗</span> Standard support
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                <button 
                  disabled
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                >
                  Upgrade to Silver (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}