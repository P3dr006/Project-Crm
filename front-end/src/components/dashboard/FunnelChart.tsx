import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function FunnelChart({ data }: { data: any[] }) {
  return (
    <div className="bg-white shadow rounded-lg border border-gray-100 p-5 h-80">
      <h4 className="text-sm font-medium text-gray-500 mb-4">Pipeline Funnel</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={80} />
          <Tooltip cursor={{fill: 'transparent'}} />
          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}