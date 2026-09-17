import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle, MapPin, Eraser } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { siteService } from '../services/siteService'
import { projectService } from '../services/projectService'
import type { Site, GeoJSONPolygon } from '../types/site'
import type { Project } from '../types/dashboard'
import { ProjectSiteMap } from '../components/map/ProjectSiteMap'

const extractApiError = (err: unknown): string => {
  const axiosError = err as AxiosError<{ detail?: string | { msg?: string }[] }>
  const detail = axiosError.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg).join(', ')
  }
  return 'An unexpected error occurred. Please try again.'
}

const validateGeometry = (geometry: GeoJSONPolygon | null): string | null => {
  if (!geometry) return 'Please draw a polygon first.'
  if (geometry.type !== 'Polygon') return 'Geometry must be a Polygon.'
  if (!geometry.coordinates || geometry.coordinates.length === 0) {
    return 'Polygon has no valid coordinates.'
  }
  const outerRing = geometry.coordinates[0]
  if (!outerRing || outerRing.length < 4) {
    return 'Polygon must have at least 4 coordinate pairs.'
  }
  const first = outerRing[0]
  const last = outerRing[outerRing.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return 'Polygon ring must be closed (first and last coordinates must match).'
  }
  for (const coord of outerRing) {
    if (coord.length < 2) return 'Each coordinate must have at least [longitude, latitude].'
    const [lng, lat] = coord
    if (lng < -180 || lng > 180) return `Longitude ${lng} is out of range [-180, 180].`
    if (lat < -90 || lat > 90) return `Latitude ${lat} is out of range [-90, 90].`
  }
  return null
}

export const ProjectSites: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [draftGeometry, setDraftGeometry] = useState<GeoJSONPolygon | null>(null)
  const [draftName, setDraftName] = useState('')

  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [editName, setEditName] = useState('')

  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [deletingSite, setDeletingSite] = useState<Site | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const id = Number(projectId)
      const [proj, siteList] = await Promise.all([
        projectService.getProject(id),
        siteService.getProjectSites(id),
      ])
      setProject(proj)
      setSites(siteList)
    } catch (err) {
      console.error(err)
      setError('Failed to load project data. Please ensure the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const resetForm = () => {
    setDraftGeometry(null)
    setDraftName('')
    setEditingSite(null)
    setEditName('')
    setIsDrawing(false)
    setActionError(null)
  }

  const handleDrawComplete = (geometry: GeoJSONPolygon) => {
    setDraftGeometry(geometry)
    setIsDrawing(false)
  }

  const handleEditComplete = (siteId: number, geometry: GeoJSONPolygon) => {
    setEditingSite((prev) => (prev && prev.id === siteId ? { ...prev, geometry } : prev))
  }

  const handleTrashDraft = () => {
    setDraftGeometry(null)
    setDraftName('')
    setIsDrawing(false)
  }

  const handleSave = async () => {
    const name = editingSite ? editName : draftName
    if (!name.trim()) {
      setActionError('Site name is required.')
      return
    }

    const geometryToValidate = editingSite ? editingSite.geometry : draftGeometry
    const geomError = validateGeometry(geometryToValidate)
    if (geomError) {
      setActionError(geomError)
      return
    }

    setActionLoading(true)
    setActionError(null)
    try {
      if (editingSite) {
        await siteService.updateSite(editingSite.id, {
          name,
          geometry: editingSite.geometry,
        })
      } else {
        await siteService.createSite(Number(projectId), {
          name,
          geometry: draftGeometry!,
        })
      }
      resetForm()
      fetchData()
    } catch (err) {
      setActionError(extractApiError(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingSite) return
    setActionLoading(true)
    setActionError(null)
    try {
      await siteService.deleteSite(deletingSite.id)
      setDeletingSite(null)
      fetchData()
    } catch (err) {
      setActionError(extractApiError(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-600" />
        <h3 className="text-lg font-medium text-yellow-900">Admin Access Required</h3>
        <p className="mb-4 mt-2 text-yellow-700">You do not have permission to manage sites.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="rounded-full p-2 hover:bg-gray-100"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project?.name || 'Project Sites'}</h1>
          <p className="text-gray-600">Manage geographical sites for this project.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sites ({sites.length})</h2>
            <button
              onClick={() => {
                setSelectedSite(null)
                setEditingSite(null)
                setDraftGeometry(null)
                setDraftName('')
                setActionError(null)
                setIsDrawing(true)
              }}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Site
            </button>
          </div>

          <div className="relative">
            <ProjectSiteMap
              sites={sites}
              isDrawing={isDrawing}
              editingSite={editingSite}
              draftGeometry={draftGeometry}
              onDrawComplete={handleDrawComplete}
              onEditComplete={handleEditComplete}
              onCancelAction={resetForm}
              onSiteClick={setSelectedSite}
              onTrashDraft={handleTrashDraft}
            />

            {isDrawing && (
              <button
                onClick={() => {
                  setDraftGeometry(null)
                  setDraftName('')
                  setIsDrawing(false)
                }}
                className="absolute bottom-4 left-4 z-10 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <Eraser className="mr-2 h-4 w-4" /> Cancel Drawing
              </button>
            )}

            {selectedSite && !isDrawing && !editingSite && (
              <div className="absolute right-4 top-4 z-10 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-bold text-gray-900">{selectedSite.name}</h3>
                  <button
                    onClick={() => setSelectedSite(null)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>
                <p className="mb-3 text-sm text-gray-600">
                  Area:{' '}
                  {selectedSite.area_hectares
                    ? `${selectedSite.area_hectares.toFixed(2)} ha`
                    : 'Calculating...'}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/sites/${selectedSite.id}/analytics`)}
                    className="flex w-full items-center rounded-md bg-blue-50 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-100"
                  >
                    <MapPin className="mr-2 h-4 w-4" /> View Analytics
                  </button>
                  <button
                    onClick={() => {
                      setEditingSite(selectedSite)
                      setEditName(selectedSite.name)
                      setSelectedSite(null)
                    }}
                    className="flex w-full items-center rounded-md bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit Site
                  </button>
                  <button
                    onClick={() => {
                      setDeletingSite(selectedSite)
                      setSelectedSite(null)
                    }}
                    className="flex w-full items-center rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Site
                  </button>
                </div>
              </div>
            )}

            {/* Edit panel - floating, allows map interaction */}
            {editingSite && (
              <div className="absolute right-4 top-4 z-20 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <h3 className="mb-2 text-lg font-bold text-gray-900">Edit Site</h3>
                <p className="mb-4 text-sm text-gray-600">
                  Drag the polygon vertices on the map to change the site boundary.
                </p>
                {actionError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {actionError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Site Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="Enter site name"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={resetForm}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={actionLoading}
                      className="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Site modal - full screen, appears after drawing is complete */}
      {draftGeometry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">New Site</h3>
            {actionError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Site Name *</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="e.g., North Forest Block"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={actionLoading}
                  className="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Site'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Site</h3>
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete "
              <span className="font-semibold">{deletingSite.name}</span>"? This action cannot be
              undone.
            </p>
            {actionError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeletingSite(null)
                  setActionError(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
