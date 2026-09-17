export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface SiteProperties {
  site_id?: number
  site_name?: string
  id?: number
  name?: string
  description?: string
  project_id: number
  project_name?: string
  area_hectares?: number
  [key: string]: unknown
}

export interface SiteFeature {
  type: 'Feature'
  id?: number | string
  geometry: GeoJSONPolygon
  properties: SiteProperties
}

export interface SiteFeatureCollection {
  type: 'FeatureCollection'
  features: SiteFeature[]
}

export interface Site {
  id: number
  project_id: number
  name: string
  description: string | null
  geometry: GeoJSONPolygon
  area_hectares: number | null
  created_at: string
  updated_at: string | null
}

export interface SiteCreate {
  name: string
  geometry: GeoJSONPolygon
}

export interface SiteUpdate {
  name?: string
  geometry?: GeoJSONPolygon
}
