import { useState } from "react";
import { CalendarDays } from "lucide-react";

type Preset = "week" | "month" | "year" | "custom";

interface DateRangeFilterProps {
  onFilterChange: (start: string, end: string) => void;
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DateRangeFilter({ onFilterChange }: DateRangeFilterProps) {
  const [active, setActive] = useState<Preset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const applyPreset = (preset: Preset) => {
    const now = new Date();
    setActive(preset);

    if (preset === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      onFilterChange(toDateStr(start), toDateStr(now));
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onFilterChange(toDateStr(start), toDateStr(end));
    } else if (preset === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      onFilterChange(toDateStr(start), toDateStr(end));
    }
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) return;
    onFilterChange(customStart, customEnd);
  };

  const btnClass = (preset: Preset) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
      active === preset
        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
    }`;

  return (
    <div className="flex flex-col gap-2">
      {/* PRESET BUTTONS */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => applyPreset("week")}  className={btnClass("week")}>This Week</button>
        <button onClick={() => applyPreset("month")} className={btnClass("month")}>This Month</button>
        <button onClick={() => applyPreset("year")}  className={btnClass("year")}>This Year</button>
        <button
          onClick={() => setActive("custom")}
          className={btnClass("custom")}
        >
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Custom
          </span>
        </button>
      </div>

      {/* CUSTOM DATE RANGE — shown when "Custom" is selected */}
      {active === "custom" && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={applyCustom}
            disabled={!customStart || !customEnd || customStart > customEnd}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
