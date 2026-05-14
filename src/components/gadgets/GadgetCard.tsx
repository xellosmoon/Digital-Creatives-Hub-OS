import { Monitor, PenTool, Cpu, Video, Camera, Smartphone, Navigation, Webcam, AlertTriangle } from 'lucide-react';
import type { AssetAvailability, AssetCategory } from '../../types/gadgets';
import { CATEGORY_LABELS } from '../../types/gadgets';

interface InventoryCardProps {
  availability: AssetAvailability;
  onBorrow: (assetId: string) => void;
}

const ICON_MAP: Record<AssetCategory, React.ElementType> = {
  interactive_display: Monitor,
  drawing_tablet: PenTool,
  computer: Cpu,
  action_camera: Video,
  camera: Camera,
  smartphone: Smartphone,
  drone: Navigation,
  webcam: Webcam,
};

export default function GadgetCard({ availability, onBorrow }: InventoryCardProps) {
  const { asset, totalItems, availableItems, maintenanceItems } = availability;
  const Icon = ICON_MAP[asset.category] ?? Monitor;
  const allUnavailable = availableItems === 0;

  const availabilityColor = allUnavailable
    ? 'text-red-600 bg-red-50'
    : availableItems <= Math.ceil(totalItems / 3)
    ? 'text-amber-600 bg-amber-50'
    : 'text-green-600 bg-green-50';

  const locationBadge =
    asset.location_mode === 'inside_only'
      ? { label: 'Inside Hub Only', cls: 'bg-blue-100 text-blue-700' }
      : asset.location_mode === 'outside_only'
      ? { label: 'Outside Use', cls: 'bg-purple-100 text-purple-700' }
      : { label: 'Inside / Outside', cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary-600" />
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${locationBadge.cls}`}>
            {locationBadge.label}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">{asset.name}</h3>
        <p className="text-xs text-gray-500 mb-3">{CATEGORY_LABELS[asset.category]}</p>

        {asset.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{asset.description}</p>
        )}

        {/* Availability indicator */}
        <div className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${availabilityColor}`}>
          <span className="font-bold">{availableItems}</span>
          <span>of {totalItems} available</span>
        </div>

        {maintenanceItems > 0 && (
          <p className="text-xs text-gray-400 mt-1">{maintenanceItems} in maintenance</p>
        )}

        {/* Mandatory notice */}
        {asset.requires_notice && (
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{asset.requires_notice}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <button
          disabled={allUnavailable}
          onClick={() => onBorrow(asset.id)}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            allUnavailable
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {allUnavailable ? 'All Units In Use' : 'Borrow This Item'}
        </button>
      </div>
    </div>
  );
}
