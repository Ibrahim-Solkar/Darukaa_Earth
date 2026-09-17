import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { Plus, ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projectService'
import type { Project, ProjectCreate, ProjectUpdate } from '../types/dashboard'
import { ProjectManagementTable } from '../components/projects/ProjectManagementTable'
import { ProjectForm } from '../components/projects/ProjectForm'

export const Projects: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError('Unable to load projects. Please ensure the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreate = () => {
    setEditingProject(undefined)
    setSubmitError(null)
    setIsFormOpen(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setSubmitError(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (data: ProjectCreate | ProjectUpdate) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      if (editingProject) {
        await projectService.updateProject(editingProject.id, data)
      } else {
        await projectService.createProject(data as ProjectCreate)
      }
      setIsFormOpen(false)
      setEditingProject(undefined)
      await fetchProjects()
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>
      const errorMessage =
        axiosError.response?.data?.detail || 'Failed to save project. Please check your inputs.'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return

    setDeleteError(null)
    try {
      await projectService.deleteProject(deletingProject.id)
      setDeletingProject(null)
      await fetchProjects()
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>
      setDeleteError(axiosError.response?.data?.detail || 'Failed to delete project.')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-600" />
        <h3 className="text-lg font-medium text-yellow-900">Admin Access Required</h3>
        <p className="mb-4 mt-2 text-yellow-700">You do not have permission to manage projects.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-1/4 rounded bg-gray-200"></div>
        <div className="h-64 rounded-lg bg-gray-200"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-medium text-red-900">Error</h3>
        <p className="mt-2 text-red-700">{error}</p>
        <button
          onClick={fetchProjects}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="mt-1 text-gray-600">Manage carbon and biodiversity projects.</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </button>
      </div>

      {/* Table */}
      <ProjectManagementTable
        projects={projects}
        onEdit={handleEdit}
        onDelete={setDeletingProject}
        onManageSites={(id) => navigate(`/projects/${id}/sites`)}
      />

      {/* Form Modal */}
      {isFormOpen && (
        <ProjectForm
          initialData={editingProject}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingProject(undefined)
            setSubmitError(null)
          }}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Project</h3>
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete "
              <span className="font-semibold">{deletingProject.name}</span>"? This action cannot be
              undone and will also delete all associated sites.
            </p>
            {deleteError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeletingProject(null)
                  setDeleteError(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
