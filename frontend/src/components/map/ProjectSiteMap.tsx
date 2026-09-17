import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { Site, GeoJSONPolygon } from '../../types/site'

// ---------------------------------------------------------------------------
// Typed payload for Mapbox Draw custom events.
// Mapbox GL Draw dispatches these on the map instance but they are not
// included in the official @types/mapbox-gl definitions.
// ---------------------------------------------------------------------------
interface DrawFeaturePayload {
  id: string
  type: 'Feature'
  geometry: GeoJSONPolygon
  properties: Record<string, unknown>
}

interface DrawEventPayload {
  features: DrawFeaturePayload[]
}

interface ProjectSiteMapProps {
  sites: Site[]
  isDrawing: boolean
  editingSite: Site | null
  draftGeometry: GeoJSONPolygon | null
  onDrawComplete: (geometry: GeoJSONPolygon) => void
  onEditComplete: (siteId: number, geometry: GeoJSONPolygon) => void
  onCancelAction: () => void
  onSiteClick: (site: Site) => void
  onTrashDraft: () => void
}

// ---------------------------------------------------------------------------
// Type-safe wrapper for Mapbox Draw custom events — no `any` anywhere.
// Uses mapboxgl.MapboxEvent as the listener signature and casts through
// `unknown` (not `any`) to bridge to our typed DrawEventPayload.
// ---------------------------------------------------------------------------
const addDrawEventListener = (
  mapInstance: mapboxgl.Map,
  eventType: 'draw.create' | 'draw.update' | 'draw.delete',
  handler: (payload: DrawEventPayload) => void,
): void => {
  mapInstance.on(eventType, (ev: mapboxgl.MapboxEvent) => {
    handler(ev as unknown as DrawEventPayload)
  })
}

export const ProjectSiteMap: React.FC<ProjectSiteMapProps> = ({
  sites,
  isDrawing,
  editingSite,
  draftGeometry,
  onDrawComplete,
  onEditComplete,
  onCancelAction,
  onSiteClick,
  onTrashDraft,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const hasInitialFitRef = useRef(false)

  // Refs to keep callbacks and state current inside Mapbox event handlers
  // without causing stale closures. Written only inside useEffect.
  const sitesRef = useRef(sites)
  const onSiteClickRef = useRef(onSiteClick)
  const onDrawCompleteRef = useRef(onDrawComplete)
  const onEditCompleteRef = useRef(onEditComplete)
  const onCancelActionRef = useRef(onCancelAction)
  const onTrashDraftRef = useRef(onTrashDraft)
  const editingSiteRef = useRef(editingSite)

  // Tracks the Mapbox Draw feature ID for the feature currently being edited.
  // This is the ID returned by draw.add(), NOT the database site ID.
  const drawFeatureIdRef = useRef<string | null>(null)

  // Tracks which site ID is currently loaded into Draw for editing,
  // so we don't re-initialize when only the geometry changes via draw.update.
  const editingSiteIdRef = useRef<number | null>(null)

  useEffect(() => {
    sitesRef.current = sites
  }, [sites])
  useEffect(() => {
    onSiteClickRef.current = onSiteClick
    onDrawCompleteRef.current = onDrawComplete
    onEditCompleteRef.current = onEditComplete
    onCancelActionRef.current = onCancelAction
    onTrashDraftRef.current = onTrashDraft
    editingSiteRef.current = editingSite
  }, [onSiteClick, onDrawComplete, onEditComplete, onCancelAction, onTrashDraft, editingSite])

  // =========================================================================
  // Map initialization — runs exactly once
  // =========================================================================
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
    if (!token) {
      console.error('Mapbox access token missing')
      return
    }

    mapboxgl.accessToken = token
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 0],
      zoom: 1,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Draw control with NO visible UI buttons.
    // Drawing/editing is triggered programmatically via draw.changeMode().
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      userProperties: true,
    })
    map.current.addControl(draw.current, 'top-left')

    map.current.on('load', () => {
      setIsMapLoaded(true)

      // Source for saved backend sites only — never add draft geometry here
      map.current!.addSource('project-sites', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.current!.addLayer({
        id: 'sites-fill',
        type: 'fill',
        source: 'project-sites',
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.3 },
      })

      map.current!.addLayer({
        id: 'sites-outline',
        type: 'line',
        source: 'project-sites',
        paint: { 'line-color': '#047857', 'line-width': 2 },
      })

      // Pointer cursor ONLY when hovering over an actual site polygon
      map.current!.on('mouseenter', 'sites-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current!.on('mouseleave', 'sites-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })

      // Site click — uses current sites via ref to avoid stale closure
      map.current!.on('click', 'sites-fill', (e) => {
        if (!e.features || e.features.length === 0) return
        const feature = e.features[0]
        const currentSites = sitesRef.current
        const site = currentSites.find((s) => s.id === Number(feature.id))
        if (site) onSiteClickRef.current(site)
      })
    })

    // --- Typed Draw event listeners ---

    addDrawEventListener(map.current, 'draw.create', (e) => {
      const feature = e.features[0]
      if (feature && feature.geometry.type === 'Polygon') {
        drawFeatureIdRef.current = feature.id
        onDrawCompleteRef.current(feature.geometry)
      }
    })

    addDrawEventListener(map.current, 'draw.update', (e) => {
      const feature = e.features[0]
      if (feature && feature.geometry.type === 'Polygon' && editingSiteRef.current) {
        onEditCompleteRef.current(editingSiteRef.current.id, feature.geometry)
      }
    })

    addDrawEventListener(map.current, 'draw.delete', () => {
      // Trash/delete key used:
      // - If editing a saved site → cancel the edit (do NOT delete from backend)
      // - If drafting a new site → clear the draft
      if (editingSiteRef.current) {
        onCancelActionRef.current()
      } else {
        onTrashDraftRef.current()
      }
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // =========================================================================
  // Update saved-sites source data; fit bounds only on initial load
  // =========================================================================
  useEffect(() => {
    if (!map.current || !isMapLoaded) return
    const source = map.current.getSource('project-sites') as mapboxgl.GeoJSONSource
    if (!source) return

    source.setData({
      type: 'FeatureCollection',
      features: sites.map((site) => ({
        type: 'Feature' as const,
        id: site.id,
        properties: { name: site.name, area: site.area_hectares },
        geometry: site.geometry,
      })),
    })

    if (!hasInitialFitRef.current && sites.length > 0 && !editingSite) {
      const coordinates = sites.flatMap((site) => site.geometry.coordinates[0])
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce(
          (b: mapboxgl.LngLatBounds, coord: number[]) => b.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(
            coordinates[0] as [number, number],
            coordinates[0] as [number, number],
          ),
        )
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
        hasInitialFitRef.current = true
      }
    }
  }, [sites, isMapLoaded, editingSite])

  // =========================================================================
  // Single unified effect: manage Draw state based on current mode.
  //
  // Four branches:
  //   1. drawing  → draw_polygon mode (clear any leftover features first)
  //   2. editing  → load geometry into Draw, direct_select for vertex editing
  //   3. draft    → polygon already in Draw from draw.create, just use simple_select
  //   4. idle     → deleteAll, return to simple_select
  //
  // This prevents the bug where draw.deleteAll() was called merely because
  // isDrawing became false, which deleted the just-drawn draft polygon.
  // =========================================================================
  useEffect(() => {
    if (!map.current || !draw.current || !isMapLoaded) return

    if (isDrawing) {
      // --- DRAWING MODE ---
      draw.current.deleteAll()
      draw.current.changeMode('draw_polygon')
    } else if (editingSite) {
      // --- EDITING MODE ---
      // Only re-initialize if we're editing a DIFFERENT site.
      // When draw.update fires, the parent updates editingSite.geometry,
      // which triggers this effect again. We must NOT re-add the feature
      // because Draw already has the updated geometry.
      if (editingSiteIdRef.current !== editingSite.id) {
        editingSiteIdRef.current = editingSite.id
        draw.current.deleteAll()

        const feature = {
          type: 'Feature' as const,
          properties: { siteId: editingSite.id },
          geometry: editingSite.geometry,
        }
        const addedIds = draw.current.add(feature)
        if (addedIds && addedIds.length > 0) {
          // Use the Draw-generated feature ID (NOT the database site ID)
          drawFeatureIdRef.current = addedIds[0]
          draw.current.changeMode('direct_select', { featureId: addedIds[0] })
        }
      }
      // Same site ID → geometry was updated by draw.update, do nothing
    } else if (draftGeometry) {
      // --- DRAFT MODE ---
      // The polygon is already in Draw's collection from the draw.create event.
      // Just switch to simple_select so the user can see it while the modal is open.
      // Do NOT call deleteAll — that would remove the draft polygon.
      draw.current.changeMode('simple_select')
    } else {
      // --- IDLE ---
      // No drawing, no editing, no draft. Clean up Draw completely.
      draw.current.deleteAll()
      draw.current.changeMode('simple_select')
      drawFeatureIdRef.current = null
      editingSiteIdRef.current = null
    }
  }, [isDrawing, editingSite, draftGeometry, isMapLoaded])

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
      <div ref={mapContainer} className="h-full w-full" />
      {isDrawing && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md border border-green-200 bg-white px-4 py-2 text-sm font-medium text-green-800 shadow-md">
          Click on the map to draw a polygon. Double-click to finish.
        </div>
      )}
    </div>
  )
}
