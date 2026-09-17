import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { createRoot, type Root } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'

import { siteService } from '../../services/siteService'
import { projectService } from '../../services/projectService'
import type { SiteProperties } from '../../types/site'
import { SitePopup } from './SitePopup'

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

interface SiteMapProps {
  onViewAnalytics?: (siteId: number) => void
}

interface MapFeature {
  id?: number | string
  properties?: Record<string, unknown> | null
}

export function SiteMap({ onViewAnalytics }: SiteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const popupRootRef = useRef<Root | null>(null)

  const onViewAnalyticsRef = useRef(onViewAnalytics)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  onViewAnalyticsRef.current = onViewAnalytics

  useEffect(() => {
    if (!mapboxToken) {
      setError(
        'Mapbox access token is missing. Add VITE_MAPBOX_ACCESS_TOKEN to frontend/.env.local and restart the Vite development server.',
      )
      setIsLoading(false)
      return
    }

    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    let cancelled = false
    let hoveredFeatureId: number | string | null = null

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [72.8777, 19.076],
      zoom: 10,
      attributionControl: true,
    })

    mapRef.current = map

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const handleMouseEnter = (event: mapboxgl.MapLayerMouseEvent) => {
      if (cancelled || !mapRef.current) {
        return
      }

      map.getCanvas().style.cursor = 'pointer'

      if (!event.features?.length) {
        return
      }

      const feature = event.features[0] as unknown as MapFeature

      hoveredFeatureId = feature.id ?? null

      if (hoveredFeatureId !== null) {
        map.setFeatureState(
          {
            source: 'darukaa-sites',
            id: hoveredFeatureId,
          },
          {
            hover: true,
          },
        )
      }
    }

    const handleMouseLeave = () => {
      if (cancelled || !mapRef.current) {
        return
      }

      map.getCanvas().style.cursor = ''

      if (hoveredFeatureId !== null) {
        map.setFeatureState(
          {
            source: 'darukaa-sites',
            id: hoveredFeatureId,
          },
          {
            hover: false,
          },
        )
      }

      hoveredFeatureId = null
    }

    const handleClick = (event: mapboxgl.MapLayerMouseEvent) => {
      if (cancelled || !mapRef.current) {
        return
      }

      if (!event.features?.length) {
        return
      }

      const feature = event.features[0] as unknown as MapFeature

      if (!feature.properties) {
        return
      }

      const properties: SiteProperties = {
        id: Number(feature.properties.id),
        project_id: Number(feature.properties.project_id),
        name: String(feature.properties.name ?? 'Unknown Site'),
        description:
          feature.properties.description != null
            ? String(feature.properties.description)
            : undefined,
        area_hectares:
          feature.properties.area_hectares != null
            ? Number(feature.properties.area_hectares)
            : undefined,
        project_name:
          feature.properties.project_name != null
            ? String(feature.properties.project_name)
            : undefined,
      }

      if (popupRootRef.current) {
        popupRootRef.current.unmount()
        popupRootRef.current = null
      }

      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }

      const popupNode = document.createElement('div')
      const root = createRoot(popupNode)

      root.render(
        <SitePopup properties={properties} onViewAnalytics={onViewAnalyticsRef.current} />,
      )

      popupRootRef.current = root

      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
      })
        .setLngLat(event.lngLat)
        .setDOMContent(popupNode)
        .addTo(map)
    }

    const loadSiteData = async () => {
      try {
        const [geojson, projects] = await Promise.all([
          siteService.getSitesGeoJSON(),
          projectService.getProjects(),
        ])

        if (cancelled || mapRef.current !== map) {
          return
        }

        const projectNameMap = new Map<number, string>()

        for (const project of projects) {
          projectNameMap.set(project.id, project.name)
        }

        const enrichedGeoJSON = {
          ...geojson,
          features: geojson.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              project_name: projectNameMap.get(feature.properties.project_id),
            },
          })),
        }

        if (!map.getSource('darukaa-sites')) {
          map.addSource('darukaa-sites', {
            type: 'geojson',
            data: enrichedGeoJSON,
            generateId: true,
          })
        }

        if (!map.getLayer('darukaa-sites-fill')) {
          map.addLayer({
            id: 'darukaa-sites-fill',
            type: 'fill',
            source: 'darukaa-sites',
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.6, 0.3],
            },
          })
        }

        if (!map.getLayer('darukaa-sites-outline')) {
          map.addLayer({
            id: 'darukaa-sites-outline',
            type: 'line',
            source: 'darukaa-sites',
            paint: {
              'line-color': '#047857',
              'line-width': 2,
            },
          })
        }

        if (!cancelled && mapRef.current === map && enrichedGeoJSON.features.length > 0) {
          const bounds = new mapboxgl.LngLatBounds()

          for (const feature of enrichedGeoJSON.features) {
            for (const ring of feature.geometry.coordinates) {
              for (const coordinate of ring) {
                bounds.extend(coordinate as [number, number])
              }
            }
          }

          if (!cancelled && mapRef.current === map && !bounds.isEmpty()) {
            requestAnimationFrame(() => {
              if (!cancelled && mapRef.current === map && !map._removed) {
                map.fitBounds(bounds, {
                  padding: 40,
                  maxZoom: 15,
                  duration: 1000,
                })
              }
            })
          }
        }

        if (!cancelled) {
          setIsLoading(false)
        }
      } catch (requestError) {
        if (cancelled) {
          return
        }

        console.error('Failed to load site map data:', requestError)

        setError('Failed to load map data. Please make sure the backend API is running.')

        setIsLoading(false)
      }
    }

    const handleMapLoad = () => {
      if (cancelled) {
        return
      }

      map.on('mouseenter', 'darukaa-sites-fill', handleMouseEnter)

      map.on('mouseleave', 'darukaa-sites-fill', handleMouseLeave)

      map.on('click', 'darukaa-sites-fill', handleClick)

      void loadSiteData()
    }

    map.once('load', handleMapLoad)

    return () => {
      cancelled = true

      map.off('load', handleMapLoad)

      map.off('mouseenter', 'darukaa-sites-fill', handleMouseEnter)

      map.off('mouseleave', 'darukaa-sites-fill', handleMouseLeave)

      map.off('click', 'darukaa-sites-fill', handleClick)

      if (hoveredFeatureId !== null) {
        try {
          map.setFeatureState(
            {
              source: 'darukaa-sites',
              id: hoveredFeatureId,
            },
            {
              hover: false,
            },
          )
        } catch {
          // Map may already be removing itself.
        }
      }

      if (popupRootRef.current) {
        popupRootRef.current.unmount()
        popupRootRef.current = null
      }

      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }

      map.remove()
      mapRef.current = null
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center md:h-[500px]">
        <p className="font-medium text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 md:h-[500px]">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />

            <span className="text-sm font-medium text-gray-600">Loading map data...</span>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  )
}
