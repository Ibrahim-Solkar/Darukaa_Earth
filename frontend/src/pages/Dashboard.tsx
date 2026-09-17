import React, { useState, useEffect } from 'react'
import { RefreshCw, Map, Leaf, TrendingUp, Users, Activity, AlertCircle } from 'lucide-react'
import { projectService } from '../services/projectService'
import type { DashboardProject, DashboardKPIs } from '../types/dashboard'
import { KpiCard } from '../components/dashboard/KpiCard'
import { ProjectTable } from '../components/dashboard/ProjectTable'
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton'
import { useNavigate } from 'react-router-dom'
import { SiteMap } from '../components/map/SiteMap'
export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectService.getDashboardData()
      setProjects(data.projects)
      setKpis(data.kpis)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Unable to load dashboard data. Please make sure the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboardData()
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-medium text-red-900">Connection Error</h3>
        <p className="mt-2 text-red-700">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Geospatial carbon and biodiversity monitoring overview.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="Total Projects"
            value={kpis.totalProjects}
            icon={Map}
            colorClass="text-green-600"
          />
          <KpiCard
            title="Total Sites"
            value={kpis.totalSites}
            icon={Users}
            colorClass="text-blue-600"
          />
          <KpiCard
            title="Total Area"
            value={`${kpis.totalAreaHectares.toFixed(1)} ha`}
            subtitle="Mapped geography"
            icon={Activity}
            colorClass="text-purple-600"
          />
          <KpiCard
            title="Current Carbon"
            value={`${kpis.currentCarbon.toLocaleString()} t`}
            subtitle="CO2 sequestered"
            icon={Leaf}
            colorClass="text-emerald-600"
          />
          <KpiCard
            title="Avg Biodiversity"
            value={kpis.avgBiodiversityScore > 0 ? kpis.avgBiodiversityScore.toFixed(1) : '—'}
            subtitle="Score (0-100)"
            icon={TrendingUp}
            colorClass="text-indigo-600"
          />
        </div>
      )}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Geospatial Site Map</h2>

          <p className="text-sm text-gray-600">
            Explore project sites and their geographic boundaries. Click a site to view its details.
          </p>
        </div>

        <SiteMap onViewAnalytics={(siteId) => navigate(`/sites/${siteId}/analytics`)} />
      </div>

      {/* Projects Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Active Projects</h2>
        <ProjectTable projects={projects} />
      </div>
    </div>
  )
}
