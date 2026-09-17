import React from 'react'
import { Pencil, Trash2, Map as MapIcon } from 'lucide-react'
import type { Project } from '../../types/dashboard'

interface ProjectManagementTableProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onManageSites: (projectId: number) => void
}

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
  }
  return map[status] || status
}

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    planning: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

export const ProjectManagementTable: React.FC<ProjectManagementTableProps> = ({
  projects,
  onEdit,
  onDelete,
  onManageSites,
}) => {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-lg font-medium text-gray-500">No projects found</p>
        <p className="mt-2 text-gray-400">Create your first project to start monitoring.</p>
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
                Targets
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Timeline
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {projects.map((project) => (
              <tr key={project.id} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{project.name}</div>
                  {project.description && (
                    <div className="max-w-xs truncate text-sm text-gray-500">
                      {project.description}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {formatProjectType(project.project_type)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(project.status)}`}
                  >
                    {formatStatus(project.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                  {project.total_area ? project.total_area.toFixed(2) : '—'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                  <div>C: {project.carbon_target ? `${project.carbon_target} t` : '—'}</div>
                  <div>B: {project.biodiversity_target ? project.biodiversity_target : '—'}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                  <div>
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                  </div>
                  <div className="text-xs text-gray-400">
                    to {project.end_date ? new Date(project.end_date).toLocaleDateString() : '—'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onManageSites(project.id)}
                      className="rounded p-1 text-green-600 hover:bg-green-50 hover:text-green-900"
                      title="Manage Sites"
                    >
                      <MapIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(project)}
                      className="rounded p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-900"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(project)}
                      className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
