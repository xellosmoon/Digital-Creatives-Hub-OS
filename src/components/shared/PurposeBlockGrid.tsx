import { Check } from 'lucide-react';
import { PURPOSE_OPTIONS } from '../../types/hub';
import type { Purpose } from '../../types/hub';

interface PurposeBlockGridProps {
  selectedValues: Purpose[];
  onChange: (values: Purpose[]) => void;
  options?: Purpose[];
  label?: string;
  description?: string;
  required?: boolean;
  gridCols?: 1 | 2 | 3;
  className?: string;
}

export default function PurposeBlockGrid({
  selectedValues,
  onChange,
  options,
  label,
  description,
  required = false,
  gridCols = 2,
  className = '',
}: PurposeBlockGridProps): JSX.Element {
  const purposeOptions = options || PURPOSE_OPTIONS;

  const togglePurpose = (purpose: Purpose): void => {
    const isSelected = selectedValues.includes(purpose);
    onChange(
      isSelected
        ? selectedValues.filter(p => p !== purpose)
        : [...selectedValues, purpose]
    );
  };

  const gridColsClass = gridCols === 1 ? 'grid-cols-1' : gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      <div className={`grid ${gridColsClass} gap-3`}>
        {purposeOptions.map((purpose: Purpose) => {
          const isSelected = selectedValues.includes(purpose);
          return (
            <label
              key={purpose}
              className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/80 shadow-md shadow-amber-100/50'
                  : 'border-gray-200 bg-gray-50/50 hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => togglePurpose(purpose)}
              />
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white group-hover:border-amber-400'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                    {purpose}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {selectedValues.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          Selected: {selectedValues.length} purpose{selectedValues.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
