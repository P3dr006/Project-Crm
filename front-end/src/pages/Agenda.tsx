import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import { Navbar } from "../components/NavBar";
import { EventModal } from "../components/EventModal";
import { 
  Calendar as CalendarIcon, Phone, Plus, AlertCircle, 
  CheckCircle2, XCircle, MessageSquare, ChevronLeft, 
  ChevronRight, Video 
} from "lucide-react";
import { toast } from "sonner";
import type { Event } from "../types/events";
import type { Lead } from "../types/lead";
import { useAuthStore } from "../store/authStore";

// Uses local time methods to avoid UTC date shift on UTC-3 (and other) timezones
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Agenda() {
  const user = useAuthStore((s) => s.user);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Right panel filters
  const [typeFilter, setTypeFilter] = useState<"all" | "callback" | "meeting">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Both filters scoped to the viewed month — overdue = items in this month before today
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay  = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const callbackStart  = toLocalDateStr(firstDay);
      const callbackEnd    = toLocalDateStr(lastDay);

      const [leadsRes, eventsRes] = await Promise.all([
        api.get(`/leads?size=100&callback_start=${callbackStart}&callback_end=${callbackEnd}`),
        api.get(`/events?scheduled_start=${callbackStart}&scheduled_end=${callbackEnd}`)
      ]);
      setLeads(leadsRes.data.leads || leadsRes.data);
      setEvents(eventsRes.data);
    } catch {
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    api.post("/leads/auto-close").catch(() => {});
    fetchData();
  }, [fetchData]);

  // --- QUICK ACTIONS ---
  const handleCallFailed = async (leadId: string) => {
    try {
      setLeads(prev => prev.filter(l => l.id !== leadId));
      await api.patch(`/leads/${leadId}`, { status: "Lost", notes: `[System] Call attempt failed/No answer.` });
      toast.success("Marked as Lost/No Answer.");
    } catch { fetchData(); }
  };

  const handleCallSuccess = async (leadId: string) => {
    try {
      setLeads(prev => prev.filter(l => l.id !== leadId));
      await api.patch(`/leads/${leadId}`, { status: "In Progress", next_contact_date: null });
      toast.success("Moved to In Progress!");
    } catch { fetchData(); }
  };

  const handleCancelCallback = async (leadId: string) => {
    try {
      setLeads(prev => prev.filter(l => l.id !== leadId));
      await api.patch(`/leads/${leadId}`, { next_contact_date: null });
      toast.success("Callback cancelled.");
    } catch { fetchData(); }
  };

  const handleEventComplete = async (eventId: string) => {
    try {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: "done" } : e));
      await api.patch(`/events/${eventId}`, { status: "done" });
      toast.success("Meeting marked as done.");
    } catch { fetchData(); }
  };

  // --- DATA NORMALIZATION (merges leads and events into a single timeline list) ---
  const normalizedItems = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    
    leads.forEach(lead => {
      if (lead.status === "Converted" || lead.status === "Lost") return;
      const dateObj = new Date(lead.next_contact_date!);
      const isOverdue = dateObj < now;
      items.push({ id: `lead_${lead.id}`, rawId: lead.id, type: "callback", title: lead.full_name, time: dateObj, isOverdue, data: lead });
    });

    events.forEach(ev => {
      if (ev.status === "cancelled" || ev.status === "done") return;
      const dateObj = new Date(ev.scheduled_at);
      const isOverdue = dateObj < now;
      items.push({ id: `ev_${ev.id}`, rawId: ev.id, type: "meeting", title: ev.title, time: dateObj, isOverdue, data: ev });
    });

    return items;
  }, [leads, events]);

  // --- RIGHT PANEL LOGIC (selected day items and overdue items) ---
  const selectedDayItems = useMemo(() => {
    let items = normalizedItems.filter(item => 
      item.time.getDate() === selectedDate.getDate() &&
      item.time.getMonth() === selectedDate.getMonth() &&
      item.time.getFullYear() === selectedDate.getFullYear()
    );

    if (typeFilter !== "all") items = items.filter(i => i.type === typeFilter);

    items.sort((a, b) => sortOrder === "asc" ? a.time.getTime() - b.time.getTime() : b.time.getTime() - a.time.getTime());
    return items;
  }, [normalizedItems, selectedDate, typeFilter, sortOrder]);

  const overdueItems = useMemo(() => {
    return normalizedItems.filter(i => i.isOverdue).sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [normalizedItems]);

  // --- CALENDAR VARIABLES ---
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const todayDate = new Date();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="py-8 px-6 flex-1 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ================================================== */}
        {/* LEFT COLUMN: MAIN CALENDAR                         */}
        {/* ================================================== */}
        <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="mt-1 text-sm text-gray-500">Select a day to view its detailed schedule.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 text-sm font-medium text-gray-600 hover:text-gray-900">Today</button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> New Meeting
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-gray-50 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{day}</div>
            ))}
            
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white min-h-[110px] p-2" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
              const isToday = todayDate.getDate() === day && todayDate.getMonth() === currentMonth.getMonth() && todayDate.getFullYear() === currentMonth.getFullYear();
              
              // Fetch items only for this calendar cell
              const dayItems = normalizedItems.filter(item => item.time.getDate() === day && item.time.getMonth() === currentMonth.getMonth() && item.time.getFullYear() === currentMonth.getFullYear());
              const callbacks = dayItems.filter(item => item.type === 'callback');
              const meetings = dayItems.filter(item => item.type === 'meeting');
              const hasOverdue = dayItems.some(item => item.isOverdue);

              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                  className={`min-h-[110px] p-2 relative cursor-pointer transition-all border border-transparent 
                    ${isSelected ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500 z-10' : 'bg-white hover:bg-gray-50 border-gray-100'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {hasOverdue && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm animate-pulse mt-1" title="Contains overdue action!"></div>}
                  </div>
                  
                  {/* INDICADORES DO CALENDÁRIO */}
                  <div className="mt-2 flex flex-col gap-1.5">
                    {dayItems.length > 3 ? (
                      <>
                        {callbacks.length > 0 && <div className="text-[10px] font-medium text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded flex items-center gap-1"><Phone className="w-2.5 h-2.5"/> {callbacks.length} Calls</div>}
                        {meetings.length > 0 && <div className="text-[10px] font-medium text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded flex items-center gap-1"><Video className="w-2.5 h-2.5"/> {meetings.length} Mtgs</div>}
                      </>
                    ) : (
                      dayItems.map(item => (
                        <div key={item.id} className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 border ${
                          item.isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 
                          item.type === 'callback' ? 'bg-blue-50/50 text-blue-700 border-blue-100' : 'bg-purple-50/50 text-purple-700 border-purple-100'
                        }`}>
                          {item.type === 'callback' ? <Phone className="w-2.5 h-2.5 shrink-0"/> : <Video className="w-2.5 h-2.5 shrink-0"/>}
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================== */}
        {/* RIGHT COLUMN: DETAIL PANEL AND FILTERS             */}
        {/* ================================================== */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* OVERDUE PANEL — always visible when there are past pending items */}
          {overdueItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-red-800 font-bold flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5"/> Action Required (Overdue)
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {overdueItems.map(item => (
                  <DetailCard key={item.id} item={item} onCallFailed={handleCallFailed} onCallSuccess={handleCallSuccess} onEventComplete={handleEventComplete} onCancelCallback={handleCancelCallback} />
                ))}
              </div>
            </div>
          )}

          {/* SELECTED DAY PANEL (with filters) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex-1 flex flex-col">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-5 gap-3 border-b pb-4">
              <h3 className="font-bold text-gray-900 text-lg tracking-tight">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'})}
              </h3>
              
              <div className="flex gap-2">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="text-xs font-medium border border-gray-200 bg-gray-50 rounded-md py-1.5 pl-2 pr-6 text-gray-700 focus:ring-blue-500 cursor-pointer outline-none">
                  <option value="all">All Types</option>
                  <option value="callback">📞 Callbacks</option>
                  <option value="meeting">📅 Meetings</option>
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="text-xs font-medium border border-gray-200 bg-gray-50 rounded-md py-1.5 pl-2 pr-6 text-gray-700 focus:ring-blue-500 cursor-pointer outline-none">
                  <option value="asc">Oldest First</option>
                  <option value="desc">Newest First</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayItems.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No tasks for this specific day.</p>
                </div>
              ) : (
                selectedDayItems.map(item => (
                  <DetailCard key={item.id} item={item} onCallFailed={handleCallFailed} onCallSuccess={handleCallSuccess} onEventComplete={handleEventComplete} onCancelCallback={handleCancelCallback} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} currentUser={user!} />
    </div>
  );
}

// ==========================================================
// COMPONENTE INTERNO: O CARD DETALHADO REUTILIZÁVEL
// ==========================================================
function DetailCard({ item, onCallFailed, onCallSuccess, onEventComplete, onCancelCallback }: any) {
  const isOverdue = item.isOverdue;
  const timeStr = item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`border rounded-xl p-4 shadow-sm transition-all ${isOverdue ? "bg-red-50/80 border-red-200 hover:shadow-md" : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"}`}>
      <div className="flex justify-between items-start gap-2">
         <div>
            <div className="flex items-center gap-1.5">
               {item.type === 'callback' ? <Phone className="w-4 h-4 text-blue-500"/> : <Video className="w-4 h-4 text-purple-500"/>}
               <h4 className={`font-semibold text-sm ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>{item.title}</h4>
            </div>
            {item.data.phone && <p className="text-xs text-gray-500 mt-1 font-medium">{item.data.phone}</p>}
         </div>
         <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${isOverdue ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
           {timeStr}
         </span>
      </div>

      {item.data.notes && (
         <p className="text-xs text-gray-600 mt-3 bg-white/80 p-2.5 rounded border border-gray-100 italic flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{item.data.notes}</span>
         </p>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100/80 flex justify-end gap-2">
         {item.type === 'callback' ? (
            <>
              <button onClick={() => onCancelCallback(item.rawId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs font-medium transition-colors"><XCircle className="w-3.5 h-3.5"/> Cancel</button>
              <button onClick={() => onCallFailed(item.rawId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors"><XCircle className="w-3.5 h-3.5"/> Lost / No Answer</button>
              <button onClick={() => onCallSuccess(item.rawId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 text-xs font-medium shadow-sm transition-colors"><CheckCircle2 className="w-3.5 h-3.5"/> Reached / Advance</button>
            </>
         ) : (
            <button onClick={() => onEventComplete(item.rawId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium shadow-sm transition-colors"><CheckCircle2 className="w-3.5 h-3.5"/> Mark as Done</button>
         )}
      </div>
    </div>
  );
}