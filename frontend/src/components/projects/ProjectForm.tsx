import React, { useState } from 'react'
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectType,
  ProjectStatus,
} from '../../types/dashboard'

interface ProjectFormProps {
  initialData?: Project
  onSubmit: (data: ProjectCreate | ProjectUpdate) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  submitError: string | null
}

const formatDateForInput = (dateStr: string | null | undefined) => {
  return dateStr ? dateStr.split('T')[0] : ''
}

const getTodayDate = () => {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}) => {
  const today = getTodayDate()

  const [startDate, setStartDate] = useState(formatDateForInput(initialData?.start_date))

  const [endDate, setEndDate] = useState(formatDateForInput(initialData?.end_date))

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setValidationError(null)

    // Validate start date
    if (startDate && startDate < today) {
      setValidationError('Start Date cannot be earlier than today.')
      return
    }

    // Validate end date
    if (endDate && endDate < today) {
      setValidationError('End Date cannot be earlier than today.')
      return
    }

    // Validate date order
    if (startDate && endDate && endDate < startDate) {
      setValidationError('End Date cannot be earlier than Start Date.')
      return
    }

    const formData = new FormData(e.currentTarget as HTMLFormElement)

    const data: ProjectCreate | ProjectUpdate = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      project_type: formData.get('project_type') as ProjectType,
      status: formData.get('status') as ProjectStatus,
      start_date: startDate || null,
      end_date: endDate || null,
      total_area: formData.get('total_area')
        ? parseFloat(formData.get('total_area') as string)
        : null,
      carbon_target: formData.get('carbon_target')
        ? parseFloat(formData.get('carbon_target') as string)
        : null,
      biodiversity_target: formData.get('biodiversity_target')
        ? parseFloat(formData.get('biodiversity_target') as string)
        : null,
    }

    await onSubmit(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Edit Project' : 'Create New Project'}
          </h2>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* API error */}
          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Date validation error */}
          {validationError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Project Name *</label>

              <input
                type="text"
                name="name"
                defaultValue={initialData?.name}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>

              <textarea
                name="description"
                defaultValue={initialData?.description || ''}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Project Type *</label>

              <select
                name="project_type"
                defaultValue={initialData?.project_type || 'carbon'}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="carbon">Carbon</option>
                <option value="biodiversity">Biodiversity</option>
                <option value="carbon_biodiversity">Carbon + Biodiversity</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status *</label>

              <select
                name="status"
                defaultValue={initialData?.status || 'planning'}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>

              <input
                type="date"
                name="start_date"
                value={startDate}
                min={today}
                onChange={(e) => {
                  const selectedDate = e.target.value

                  setStartDate(selectedDate)
                  setValidationError(null)

                  // If the new start date is after the existing
                  // end date, clear the end date.
                  if (endDate && selectedDate > endDate) {
                    setEndDate('')
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />

              <p className="mt-1 text-xs text-gray-500">Today or a future date only.</p>
            </div>

            {/* End Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>

              <input
                type="date"
                name="end_date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setValidationError(null)
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />

              <p className="mt-1 text-xs text-gray-500">Must be today or after the Start Date.</p>
            </div>

            {/* Total Area */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Total Area (ha)
              </label>

              <input
                type="number"
                name="total_area"
                step="0.01"
                min="0"
                defaultValue={initialData?.total_area || ''}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            {/* Carbon Target */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Carbon Target (t)
              </label>

              <input
                type="number"
                name="carbon_target"
                step="0.01"
                min="0"
                defaultValue={initialData?.carbon_target || ''}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            {/* Biodiversity Target */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Biodiversity Target
              </label>

              <input
                type="number"
                name="biodiversity_target"
                step="0.01"
                min="0"
                max="100"
                defaultValue={initialData?.biodiversity_target || ''}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
