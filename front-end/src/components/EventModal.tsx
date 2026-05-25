import { useState, useEffect } from "react";
import { api } from "../services/api";
import { toast } from "sonner";
import { X } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: { id: string; role: string };
}

export function EventModal({ isOpen, onClose, onSuccess, currentUser }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [team, setTeam] = useState<{ id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser.role !== "Employee") {
      api.get("/users/members").then((res) => setTeam(res.data)).catch(console.error);
    }
  }, [isOpen, currentUser.role]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Converte o datetime-local (YYYY-MM-DDThh:mm) para ISO UTC
      const isoDate = new Date(scheduledAt).toISOString();
      
      await api.post("/events", {
        title,
        scheduled_at: isoDate,
        type: "meeting",
        notes: notes || undefined,
        assigned_to: assignedTo || currentUser.id,
      });
      
      toast.success("Meeting scheduled successfully!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to schedule meeting.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">New Meeting</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title / Subject *</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Product Demo with Acme Corp" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
            <input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>

          {currentUser.role !== "Employee" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value={currentUser.id}>Assign to me</option>
                {team.filter((m) => m.id !== currentUser.id).map((member) => (
                  <option key={member.id} value={member.id}>{member.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agenda / Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Meeting topics..." />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? "Saving..." : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}