export function DateRangeFilter({ onFilterChange }: { onFilterChange: (start: string, end: string) => void }) {
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    onFilterChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-lg shadow-sm border border-gray-200">
      <button onClick={() => setPreset(7)} className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 border rounded-md transition">7 days</button>
      <button onClick={() => setPreset(30)} className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 border rounded-md transition">30 days</button>
      <button onClick={() => setPreset(90)} className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 border rounded-md transition">3 months</button>
      <button onClick={() => onFilterChange("", "")} className="px-3 py-1 text-sm text-blue-600 hover:underline">All time</button>
    </div>
  );
}