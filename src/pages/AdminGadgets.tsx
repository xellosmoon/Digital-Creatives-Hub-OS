import { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle, Wrench, Clock, ClipboardList,
  UserPlus, RefreshCw, CheckCircle, Activity, FileText,
  Plus, Pencil, Trash2, Settings2, Layers,
} from 'lucide-react';
import { isPast } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatPeso } from '../lib/pricingEngine';
import AdminItemStatusTable from '../components/gadgets/AdminItemStatusTable';
import AdminBorrowingTable from '../components/gadgets/AdminBorrowingTable';
import BorrowingLogsTable from '../components/gadgets/BorrowingLogsTable';
import ManualBorrowModal from '../components/gadgets/ManualBorrowModal';
import AssetFormModal from '../components/gadgets/AssetFormModal';
import ItemManagementPanel from '../components/gadgets/ItemManagementPanel';
import { CATEGORY_LABELS } from '../types/gadgets';
import type { Borrowing, Item, Asset, PricingTier } from '../types/gadgets';

type TabKey = 'assets' | 'items' | 'queue' | 'active' | 'logs' | 'maintenance';

export default function AdminGadgets() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('assets');
  const [showManualBorrow, setShowManualBorrow] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [managingUnitsAsset, setManagingUnitsAsset] = useState<Asset | null>(null);
  const [confirmDeleteAssetId, setConfirmDeleteAssetId] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, iRes, aRes, pRes] = await Promise.all([
        supabase
          .from('borrowings')
          .select('*, item:items(id, asset_tag, serial_number, status), asset:assets(name, slug, requires_notice)')
          .order('created_at', { ascending: false }),
        supabase.from('items').select('*, asset:assets(name, slug, requires_notice)'),
        supabase.from('assets').select('*'),
        supabase.from('pricing_config').select('*'),
      ]);

      if (bRes.error) throw bRes.error;
      if (iRes.error) throw iRes.error;
      if (aRes.error) throw aRes.error;
      if (pRes.error) throw pRes.error;

      setBorrowings((bRes.data ?? []) as Borrowing[]);
      setItems((iRes.data ?? []) as Item[]);
      setAssets((aRes.data ?? []) as Asset[]);
      setPricing((pRes.data ?? []) as PricingTier[]);
    } catch (err) {
      console.error('Admin gadget fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time subscription for borrowings
    const sub = supabase
      .channel('admin-gadgets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrowings' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchData())
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [fetchData]);

  // ── Derived counts ──
  const pendingCount = borrowings.filter((b) => b.status === 'pending').length;
  const activeCount = borrowings.filter((b) => b.status === 'active' || b.status === 'approved').length;
  const overdueCount = borrowings.filter(
    (b) => b.status === 'active' && isPast(new Date(b.end_time))
  ).length;
  const maintenanceCount = items.filter((i) => i.status === 'maintenance').length;
  const brokenCount = items.filter((i) => i.status === 'broken').length;
  const totalCollected = borrowings
    .filter((b) => b.status === 'returned' || b.status === 'active')
    .reduce((s, b) => s + (b.total_price ?? 0), 0);

  // ── Filtered data per tab ──
  const pendingBorrowings = borrowings.filter((b) => b.status === 'pending');
  const activeBorrowings = borrowings.filter(
    (b) => b.status === 'active' || b.status === 'approved'
  );
  const flaggedItems = items.filter((i) => i.status === 'maintenance' || i.status === 'broken');

  const handleDeleteAsset = async (assetId: string) => {
    setDeletingAssetId(assetId);
    try {
      // Check if any items are currently borrowed
      const borrowed = items.filter((i) => i.asset_id === assetId && i.status === 'borrowed');
      if (borrowed.length > 0) {
        toast.error('Cannot delete — some units are currently borrowed. Return them first.');
        return;
      }
      const { error } = await supabase.from('assets').delete().eq('id', assetId);
      if (error) throw error;
      toast.success('Asset deleted');
      setConfirmDeleteAssetId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingAssetId(null);
    }
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'assets', label: 'Gadget Models', icon: Layers },
    { key: 'items', label: 'All Units', icon: Package },
    { key: 'queue', label: 'Approval Queue', icon: Clock, count: pendingCount },
    { key: 'active', label: 'Active / Overdue', icon: Activity, count: overdueCount || undefined },
    { key: 'logs', label: 'Borrowing Logs', icon: FileText },
    { key: 'maintenance', label: 'Flagged', icon: Wrench, count: maintenanceCount + brokenCount || undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gadget Ops Center</h1>
              <p className="text-sm text-gray-500">Manage gear, track borrowings, and maintain equipment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualBorrow(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Manual Borrow
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KPI label="Total Items" value={items.length} color="text-gray-900" />
          <KPI label="Available" value={items.filter((i) => i.status === 'available').length} color="text-green-600" />
          <KPI label="Borrowed" value={items.filter((i) => i.status === 'borrowed').length} color="text-blue-600" />
          <KPI label="Pending" value={pendingCount} color="text-yellow-600" />
          <KPI label="Overdue" value={overdueCount} color="text-red-600" />
          <KPI label="Revenue" value={formatPeso(totalCollected)} color="text-green-700" isText />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${active
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                      }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : tab === 'assets' ? (
            <div className="p-6">
              {/* Add Asset button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Gadget Catalogue ({assets.length})
                </h3>
                <button
                  onClick={() => { setEditingAsset(null); setShowAssetForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Asset
                </button>
              </div>

              {assets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No assets yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first piece of equipment above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset) => {
                    const unitCount = items.filter((i) => i.asset_id === asset.id).length;
                    const availCount = items.filter((i) => i.asset_id === asset.id && i.status === 'available').length;
                    const isDeleting = deletingAssetId === asset.id;
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">{asset.name}</h4>
                            {!asset.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {CATEGORY_LABELS[asset.category]}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{unitCount} unit{unitCount !== 1 ? 's' : ''} ({availCount} available)</span>
                            <span className="font-mono">{asset.slug}</span>
                            <span>{asset.location_mode === 'both' ? 'Inside & Outside' : asset.location_mode === 'inside_only' ? 'Inside Only' : 'Outside Only'}</span>
                            {asset.requires_notice && (
                              <span className="text-amber-600">⚠ Notice required</span>
                            )}
                          </div>
                          {asset.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{asset.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          {/* Manage Units */}
                          <button
                            onClick={() => setManagingUnitsAsset(asset)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                            title="Manage individual units"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Units
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => { setEditingAsset(asset); setShowAssetForm(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit asset"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {/* Delete */}
                          {confirmDeleteAssetId === asset.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteAsset(asset.id)}
                                disabled={isDeleting}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                              >
                                {isDeleting ? 'Deleting…' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteAssetId(null)}
                                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteAssetId(asset.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete asset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : tab === 'items' ? (
            <AdminItemStatusTable
              items={items as any}
              activeBorrowings={activeBorrowings}
              onRefresh={fetchData}
            />
          ) : tab === 'queue' ? (
            pendingBorrowings.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
                <p className="font-medium">All clear — no pending requests.</p>
              </div>
            ) : (
              <AdminBorrowingTable borrowings={pendingBorrowings as any} onRefresh={fetchData} />
            )
          ) : tab === 'active' ? (
            <AdminBorrowingTable borrowings={activeBorrowings as any} onRefresh={fetchData} />
          ) : tab === 'logs' ? (
            <BorrowingLogsTable borrowings={borrowings as any} />
          ) : tab === 'maintenance' ? (
            <AdminItemStatusTable
              items={flaggedItems as any}
              activeBorrowings={[]}
              onRefresh={fetchData}
            />
          ) : null}
        </div>
      </div>

      {/* Manual Borrow Modal */}
      {showManualBorrow && (
        <ManualBorrowModal
          assets={assets}
          items={items}
          pricing={pricing}
          onClose={() => setShowManualBorrow(false)}
          onSuccess={() => { setShowManualBorrow(false); fetchData(); }}
        />
      )}

      {showAssetForm && (
        <AssetFormModal
          asset={editingAsset}
          onClose={() => { setShowAssetForm(false); setEditingAsset(null); }}
          onSuccess={() => { setShowAssetForm(false); setEditingAsset(null); fetchData(); }}
        />
      )}

      {managingUnitsAsset && (
        <ItemManagementPanel
          asset={managingUnitsAsset}
          items={items}
          onClose={() => setManagingUnitsAsset(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

function KPI({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{isText ? value : value}</p>
    </div>
  );
}
