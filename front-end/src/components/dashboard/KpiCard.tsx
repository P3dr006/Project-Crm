import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export function KpiCard({ title, value, icon, trend, trendUp }: KpiCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5 flex items-center">
      <div className="p-3 rounded-md bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="ml-5 w-full">
        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
        <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
          <div className="flex items-baseline text-2xl font-semibold text-gray-900">
            {value}
          </div>
          {trend && (
            <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0 ${trendUp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </div>
          )}
        </dd>
      </div>
    </div>
  );
}