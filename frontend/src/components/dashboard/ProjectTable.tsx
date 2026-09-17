import React from 'react'
import type { DashboardProject } from '../../types/dashboard'
import { ProgressBar } from './ProgressBar'

const formatProjectType = (type: string) => {
  const map: Record<string, string> = {
    carbon: 'Carbon',
    biodiversity: 'Biodiversity',
    carbon_biodiversity: 'Carbon + Biodiversity',
  }
  return map[type] || type
}

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    planning: 'Planning',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  }
  return map[status] || status
}

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    planning: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

interface ProjectTableProps {
  projects: DashboardProject[]
}

export const ProjectTable: React.FC<ProjectTableProps> = ({ projects }) => {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-lg font-medium text-gray-500">No projects found</p>
        <p className="mt-2 text-gray-400">
          Create your first project to start monitoring carbon and biodiversity metrics.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Project
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Area (ha)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Sites
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Carbon Progress
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Biodiversity Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {projects.map((dp) => {
              const analytics = dp.analytics
              return (
                <tr key={dp.project.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{dp.project.name}</div>
                    {dp.project.description && (
                      <div className="max-w-xs truncate text-sm text-gray-500">
                        {dp.project.description}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {formatProjectType(dp.project.project_type)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(dp.project.status)}`}
                    >
                      {formatStatus(dp.project.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                    {analytics ? analytics.total_area_hectares.toFixed(2) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                    {analytics ? analytics.total_sites : '—'}
                  </td>
                  <td className="w-48 whitespace-nowrap px-6 py-4">
                    {analytics ? (
                      <ProgressBar value={analytics.carbon_progress_percent} color="green" />
                    ) : (
                      <span className="text-sm text-gray-400">No data</span>
                    )}
                  </td>
                  <td className="w-48 whitespace-nowrap px-6 py-4">
                    {analytics ? (
                      <ProgressBar value={analytics.biodiversity_progress_percent} color="blue" />
                    ) : (
                      <span className="text-sm text-gray-400">No data</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
