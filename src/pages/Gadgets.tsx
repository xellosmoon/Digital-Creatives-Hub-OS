import { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GadgetGrid from '../components/gadgets/GadgetGrid';
import BorrowWizard from '../components/gadgets/BorrowWizard';
import type { Asset, Item, PricingTier, AssetAvailability } from '../types/gadgets';

export default function Gadgets(): JSX.Element {
  const [assets, setAssets] = useState<AssetAvailability[]>([]);
  const [allPricing, setAllPricing] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, itemsRes, pricingRes] = await Promise.all([
        supabase.from('assets').select('*').eq('is_active', true).order('name'),
        supabase.from('items').select('*'),
        supabase.from('pricing_config').select('*'),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (pricingRes.error) throw pricingRes.error;

      const assetList = (assetsRes.data ?? []) as Asset[];
      const itemList = (itemsRes.data ?? []) as Item[];
      const pricingList = (pricingRes.data ?? []) as PricingTier[];

      setAllPricing(pricingList);

      // Compute availability per asset (informational only — the wizard
      // re-checks real-time, conflict-aware availability once a time
      // window is chosen, via the get_available_items RPC).
      const avail: AssetAvailability[] = assetList.map((asset) => {
        const items = itemList.filter((i) => i.asset_id === asset.id);
        return {
          asset,
          totalItems: items.length,
          availableItems: items.filter((i) => i.status === 'available').length,
          borrowedItems: items.filter((i) => i.status === 'borrowed').length,
          maintenanceItems: items.filter((i) => i.status === 'maintenance').length,
          brokenItems: items.filter((i) => i.status === 'broken').length,
        };
      });

      setAssets(avail);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBorrow = (assetId: string): void => {
    const a = assets.find((x) => x.asset.id === assetId);
    if (a) setSelectedAsset(a.asset);
  };

  const handleWizardClose = (): void => setSelectedAsset(null);
  const handleWizardSuccess = (): void => {
    setSelectedAsset(null);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gadgets & Gear</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional equipment for your creative flow</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Total Gadgets"
            value={assets.reduce((s, a) => s + a.totalItems, 0)}
            color="text-gray-900 dark:text-white"
          />
          <SummaryCard
            label="Available"
            value={assets.reduce((s, a) => s + a.availableItems, 0)}
            color="text-green-600 dark:text-green-400"
          />
          <SummaryCard
            label="Borrowed"
            value={assets.reduce((s, a) => s + a.borrowedItems, 0)}
            color="text-blue-600 dark:text-blue-400"
          />
          <SummaryCard
            label="Maintenance"
            value={assets.reduce((s, a) => s + a.maintenanceItems, 0)}
            color="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Grid */}
        <GadgetGrid assets={assets} loading={loading} onBorrow={handleBorrow} />
      </div>

      {/* Borrowing Wizard */}
      {selectedAsset && (
        <BorrowWizard
          initialAsset={selectedAsset}
          allAssets={assets}
          allPricing={allPricing}
          onClose={handleWizardClose}
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
