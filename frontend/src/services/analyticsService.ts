import api from './api'
import type { SiteAnalytics } from '../types/analytics'

export const analyticsService = {
  async getSiteAnalytics(siteId: number): Promise<SiteAnalytics> {
    const response = await api.get<SiteAnalytics>(`/sites/${siteId}/analytics`)

    return response.data
  },
}
