import api from './api'
import type { Site, SiteCreate, SiteUpdate, SiteFeatureCollection } from '../types/site'

export const siteService = {
  async getSitesGeoJSON(): Promise<SiteFeatureCollection> {
    const response = await api.get<SiteFeatureCollection>('/sites/geojson')
    return response.data
  },

  async getProjectSites(projectId: number): Promise<Site[]> {
    const response = await api.get<Site[]>(`/projects/${projectId}/sites`)
    return response.data
  },

  async createSite(projectId: number, data: SiteCreate): Promise<Site> {
    const response = await api.post<Site>(`/projects/${projectId}/sites`, data)
    return response.data
  },

  async getSite(siteId: number): Promise<Site> {
    const response = await api.get<Site>(`/sites/${siteId}`)
    return response.data
  },

  async updateSite(siteId: number, data: SiteUpdate): Promise<Site> {
    const response = await api.put<Site>(`/sites/${siteId}`, data)
    return response.data
  },

  async deleteSite(siteId: number): Promise<void> {
    await api.delete(`/sites/${siteId}`)
  },
}
