// Shared per-item color treatment for chip/tile grids (purposes, creative
// domains, sector, gender, etc.) — GRADIENTS is the selected state, TINTS is
// the unselected state. Both carry light- and dark-mode classes together so
// one index works everywhere regardless of theme.
export const CHIP_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-teal-500 to-emerald-500',
  'from-green-500 to-lime-500',
  'from-yellow-500 to-amber-500',
  'from-orange-500 to-red-500',
  'from-red-500 to-pink-500',
  'from-indigo-500 to-purple-500',
  'from-violet-500 to-fuchsia-500',
];

export const CHIP_TINTS = [
  'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-400/30 text-pink-700 dark:text-pink-100 hover:bg-pink-100 dark:hover:bg-pink-500/20',
  'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-400/30 text-purple-700 dark:text-purple-100 hover:bg-purple-100 dark:hover:bg-purple-500/20',
  'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-500/20',
  'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-400/30 text-teal-700 dark:text-teal-100 hover:bg-teal-100 dark:hover:bg-teal-500/20',
  'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-400/30 text-green-700 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-500/20',
  'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-400/30 text-yellow-700 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-500/20',
  'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-400/30 text-orange-700 dark:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-500/20',
  'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-500/20',
  'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-500/20',
  'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-400/30 text-violet-700 dark:text-violet-100 hover:bg-violet-100 dark:hover:bg-violet-500/20',
];

interface ChipGridProps {
  options: readonly string[];
  /** Currently selected value(s). Pass a 1-item array for single-select fields. */
  selected: string[];
  /**
   * Called with the tapped option. Whether this behaves as single-select
   * (replace) or multi-select (toggle) is entirely up to the caller's
   * `selected`/`onSelect` wiring — this component only renders and reports taps.
   */
  onSelect: (option: string) => void;
  size?: 'sm' | 'lg';
}

export default function ChipGrid({ options, selected, onSelect, size = 'lg' }: ChipGridProps): JSX.Element {
  return (
    <div className={size === 'lg' ? 'grid grid-cols-2 sm:grid-cols-3 gap-2' : 'flex flex-wrap gap-1.5'}>
      {options.map((opt, index) => {
        const isSelected = selected.includes(opt);
        const colorClass = CHIP_GRADIENTS[index % CHIP_GRADIENTS.length];
        const tintClass = CHIP_TINTS[index % CHIP_TINTS.length];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`rounded-xl border-2 font-semibold transition-all text-left ${
              size === 'lg' ? 'px-3 py-2.5 text-xs' : 'px-2.5 py-1.5 text-[11px]'
            } ${
              isSelected
                ? `bg-gradient-to-r ${colorClass} text-white border-transparent shadow-md scale-[1.02]`
                : `${tintClass} border-2`
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
