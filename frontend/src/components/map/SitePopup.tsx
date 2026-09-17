import type { SiteProperties } from '../../types/site'

interface SitePopupProps {
  properties: SiteProperties
  onViewAnalytics?: (siteId: number) => void
}

export function SitePopup({ properties, onViewAnalytics }: SitePopupProps) {
  return (
    <div className="min-w-[220px] p-3 font-sans">
      <h3 className="mb-1 text-base font-bold leading-tight text-gray-900">
        {String(properties.name ?? properties.site_name ?? '')}
      </h3>

      {properties.project_name ? (
        <p className="mb-3 text-sm text-gray-600">
          Project: <span className="font-medium text-gray-800">{properties.project_name}</span>
        </p>
      ) : (
        <p className="mb-3 text-sm text-gray-600">
          Project ID: <span className="font-medium text-gray-800">{properties.project_id}</span>
        </p>
      )}

      {properties.description && (
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          {String(properties.description ?? '')}
        </p>
      )}

      <div className="mb-4 space-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
        <p>Site ID: {String(properties.id ?? properties.site_id ?? '')}</p>

        <p>
          Area:{' '}
          {typeof properties.area_hectares === 'number'
            ? `${properties.area_hectares.toFixed(2)} ha`
            : 'N/A'}
        </p>
      </div>

      {onViewAnalytics && (
        <button
          type="button"
          onClick={() => onViewAnalytics(Number(properties.id ?? properties.site_id))}
          className="w-full rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800"
        >
          View Analytics
        </button>
      )}
    </div>
  )
}
