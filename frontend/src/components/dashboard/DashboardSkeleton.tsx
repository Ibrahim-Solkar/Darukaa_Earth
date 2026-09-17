import React from 'react'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg border border-gray-200 bg-white p-6"></div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6 h-8 w-1/4 rounded bg-gray-200"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-gray-100"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
