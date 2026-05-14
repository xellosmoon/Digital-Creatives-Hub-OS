import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import type { AssetAvailability, AssetCategory } from '../../types/gadgets';
import { CATEGORY_LABELS } from '../../types/gadgets';
import GadgetCard from './GadgetCard';

interface InventoryGridProps {
  assets: AssetAvailability[];
  loading: boolean;
  onBorrow: (assetId: string) => void;
}

const ALL_CATEGORIES: AssetCategory[] = [
  'interactive_display', 'drawing_tablet', 'computer',
  'action_camera', 'camera', 'smartphone', 'drone', 'webcam',
];

export default function GadgetGrid({ assets, loading, onBorrow }: InventoryGridProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchSearch =
        a.asset.name.toLowerCase().includes(search.toLowerCase()) ||
        a.asset.description?.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === 'all' || a.asset.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [assets, search, categoryFilter]);

  // Categories present in the actual data
  const presentCategories = useMemo(
    () => [...new Set(assets.map((a) => a.asset.category))],
    [assets]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search equipment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as AssetCategory | 'all')}
            className="pl-10 pr-8 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.filter((c) => presentCategories.includes(c)).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No equipment found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((a) => (
            <GadgetCard key={a.asset.id} availability={a} onBorrow={onBorrow} />
          ))}
        </div>
      )}
    </div>
  );
}
