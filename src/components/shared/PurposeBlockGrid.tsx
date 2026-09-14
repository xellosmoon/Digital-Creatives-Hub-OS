import { Check } from 'lucide-react';
import { PURPOSE_OPTIONS } from '../../types/hub';
import type { Purpose } from '../../types/hub';
import { CHIP_GRADIENTS, CHIP_TINTS } from './ChipGrid';

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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </label>
      )}
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</p>
      )}
      <div className={`grid ${gridColsClass} gap-3`}>
        {purposeOptions.map((purpose: Purpose, index: number) => {
          const isSelected = selectedValues.includes(purpose);
          const gradient = CHIP_GRADIENTS[index % CHIP_GRADIENTS.length];
          const tint = CHIP_TINTS[index % CHIP_TINTS.length];
          return (
            <label
              key={purpose}
              className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? `bg-gradient-to-r ${gradient} border-transparent text-white shadow-md scale-[1.02]`
                  : `${tint} border-2`
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => togglePurpose(purpose)}
              />
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  isSelected ? 'border-white/40 bg-white/20' : 'border-current/30 bg-white/60 dark:bg-slate-800'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {purpose}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {selectedValues.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Selected: {selectedValues.length} purpose{selectedValues.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
