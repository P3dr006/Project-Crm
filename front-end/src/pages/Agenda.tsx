import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { Navbar } from "../components/NavBar";
import { toast } from "sonner";
import { Phone, Calendar as CalendarIcon, AlertCircle, CheckCircle2, XCircle, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import type { Lead } from "../types/lead";

export function Agenda() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State to control the currently visible calendar month
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchFollowUps = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/leads?size=100");
      const data = response.data.leads || response.data;
      const scheduledLeads = data.filter((l: Lead) => l.next_contact_date);
      setLeads(scheduledLeads);
    } catch {
      toast.error("Failed to load your schedule.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // QUICK ACTIONS
  const handleCallFailed = async (leadId: string) => {
    try {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      await api.patch(`/leads/${leadId}`, {
        status: "Lost",
        notes: `[System Note] Call attempted but client did not answer or was lost.`,
      });
      toast.success("Lead marked as Lost/No Answer.");
    } catch {
      toast.error("Failed to update lead.");
      fetchFollowUps();
    }
  };

  const handleCallSuccess = async (leadId: string) => {
    try {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      await api.patch(`/leads/${leadId}`, {
        status: "In Progress",
        notes: `[System Note] Contact established. Moving forward with the sales process.`,
      });
      toast.success("Lead successfully moved to In Progress! 🚀");
    } catch {
      toast.error("Failed to update lead.");
      fetchFollowUps();
    }
  };

  // Column separation
  const getCategorizedLeads = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      overdue: leads.filter((l) => l.next_contact_date! < todayStr && l.status !== "Converted" && l.status !== "Lost"),
      today: leads.filter((l) => l.next_contact_date!.startsWith(todayStr)),
      upcoming: leads.filter((l) => l.next_contact_date! > todayStr),
    };
  };

  const { overdue, today, upcoming } = getCategorizedLeads();

  // ==========================================
  // CALENDAR LOGIC
  // ==========================================
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const todayDate = new Date();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Checks whether a specific day has scheduled follow-ups
  const getLeadsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leads.filter(l => l.next_contact_date?.startsWith(dateStr));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="py-8 px-6 flex-1 max-w-[1600px] w-full mx-auto flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Schedule</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your daily follow-ups and customer callbacks with quick actions.
          </p>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-gray-200 rounded-xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => <div key={n} className="bg-gray-200 rounded-xl h-96" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* THE NEW CALENDAR BLOCK */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Weekday Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
                
                {/* Empty spaces before day 1 */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white min-h-[80px] p-2" />
                ))}

                {/* The days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === todayDate.getDate() && currentMonth.getMonth() === todayDate.getMonth() && currentMonth.getFullYear() === todayDate.getFullYear();
                  const dayLeads = getLeadsForDay(day);
                  const hasOverdue = dayLeads.some(l => l.next_contact_date! < todayDate.toISOString().split("T")[0]);

                  return (
                    <div key={day} className={`bg-white min-h-[80px] p-2 relative transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      
                      {/* Task indicators */}
                      {dayLeads.length > 0 && (
                        <div className="mt-1 flex flex-col gap-1">
                          {dayLeads.slice(0, 2).map(l => (
                            <div key={l.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${hasOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {l.full_name.split(' ')[0]}
                            </div>
                          ))}
                          {dayLeads.length > 2 && (
                            <div className="text-[10px] text-gray-400 font-medium px-1">
                              +{dayLeads.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* THE ORIGINAL 3 COLUMNS (Unchanged, just moved down) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* COLUMN 1: OVERDUE */}
              <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                <div className="bg-red-50/50 border-b border-red-100 px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">Overdue Callbacks</h3>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{overdue.length}</span>
                </div>
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {overdue.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No overdue contacts. Great job! ✨</p>
                  ) : (
                    overdue.map((lead) => <ScheduleCard key={lead.id} lead={lead} onFail={() => handleCallFailed(lead.id)} onSuccess={() => handleCallSuccess(lead.id)} />)
                  )}
                </div>
              </div>

              {/* COLUMN 2: TODAY */}
              <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                <div className="bg-blue-50/50 border-b border-blue-100 px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Phone className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">Today's Tasks</h3>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{today.length}</span>
                </div>
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {today.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">All clear for today!</p>
                  ) : (
                    today.map((lead) => <ScheduleCard key={lead.id} lead={lead} onFail={() => handleCallFailed(lead.id)} onSuccess={() => handleCallSuccess(lead.id)} />)
                  )}
                </div>
              </div>

              {/* COLUMN 3: UPCOMING */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CalendarIcon className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">Upcoming Follow-ups</h3>
                  </div>
                  <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{upcoming.length}</span>
                </div>
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {upcoming.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No upcoming agendaments.</p>
                  ) : (
                    upcoming.map((lead) => <ScheduleCard key={lead.id} lead={lead} onFail={() => handleCallFailed(lead.id)} onSuccess={() => handleCallSuccess(lead.id)} />)
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

// INTERNAL COMPONENT: CARD (Unchanged)
interface ScheduleCardProps {
  lead: Lead;
  onFail: () => void;
  onSuccess: () => void;
}

function ScheduleCard({ lead, onFail, onSuccess }: ScheduleCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-gray-900 text-sm truncate">{lead.full_name}</h4>
          <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
            {lead.source}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
        {lead.notes && (
          <p className="text-xs bg-gray-50 p-2 border border-gray-100 rounded text-gray-600 mt-2 italic flex items-start gap-1">
            <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
            <span className="truncate">{lead.notes}</span>
          </p>
        )}
      </div>
      <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />
          {lead.next_contact_date ? new Date(lead.next_contact_date).toLocaleDateString() : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={onFail} title="Lost / No Answer" className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
          <button onClick={onSuccess} title="Interested / In Progress" className="p-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}