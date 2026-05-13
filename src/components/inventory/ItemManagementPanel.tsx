import { useState } from 'react';
import { Plus, Trash2, X, Save, Tag, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { Asset, Item } from '../../types/inventory';

interface ItemManagementPanelProps {
  asset: Asset;
  items: Item[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function ItemManagementPanel({
  asset,
  items,
  onClose,
  onRefresh,
}: ItemManagementPanelProps) {
  const [newTag, setNewTag] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const assetItems = items.filter((i) => i.asset_id === asset.id);

  const handleAddUnit = async () => {
    if (!newTag.trim()) {
      toast.error('Asset tag is required.');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.from('items').insert({
        asset_id: asset.id,
        asset_tag: newTag.trim(),
        serial_number: newSerial.trim() || null,
        condition_notes: newNotes.trim() || null,
        status: 'available',
        current_location: 'DCIH Storage',
      });
      if (error) throw error;

      // Update asset total_quantity
      await supabase
        .from('assets')
        .update({ total_quantity: assetItems.length + 1 })
        .eq('id', asset.id);

      toast.success(`Unit ${newTag.trim()} added!`);
      setNewTag('');
      setNewSerial('');
      setNewNotes('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add unit');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUnit = async (itemId: string) => {
    const item = assetItems.find((i) => i.id === itemId);
    if (item?.status === 'borrowed') {
      toast.error('Cannot delete a borrowed unit. Return it first.');
      return;
    }

    setDeletingId(itemId);
    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw error;

      // Update asset total_quantity
      await supabase
        .from('assets')
        .update({ total_quantity: Math.max(0, assetItems.length - 1) })
        .eq('id', asset.id);

      toast.success('Unit deleted');
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    available: 'bg-green-50 text-green-700',
    borrowed: 'bg-blue-50 text-blue-700',
    maintenance: 'bg-yellow-50 text-yellow-700',
    broken: 'bg-red-50 text-red-700',
    retired: 'bg-gray-50 text-gray-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Manage Units — {asset.name}
            </h2>
            <p className="text-sm text-gray-500">
              {assetItems.length} unit{assetItems.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Add new unit form */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Unit
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Tag className="inline h-3 w-3 mr-1" />
                  Asset Tag <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. DCIH-CAM-004"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Hash className="inline h-3 w-3 mr-1" />
                  Serial Number
                </label>
                <input
                  type="text"
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Condition Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. New, refurbished, etc."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleAddUnit}
              disabled={adding}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add Unit'}
            </button>
          </div>

          {/* Existing units list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Existing Units ({assetItems.length})
            </h3>
            {assetItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No units yet. Add one above.
              </p>
            ) : (
              <div className="space-y-2">
                {assetItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {item.asset_tag ?? '—'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || ''}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {item.serial_number && <span>SN: {item.serial_number}</span>}
                        <span>📍 {item.current_location || 'DCIH Storage'}</span>
                        {item.condition_notes && <span>• {item.condition_notes}</span>}
                      </div>
                    </div>

                    {/* Delete button */}
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={() => handleDeleteUnit(item.id)}
                          disabled={deletingId === item.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === item.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        disabled={item.status === 'borrowed'}
                        className="p-1.5 ml-3 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={item.status === 'borrowed' ? 'Return item before deleting' : 'Delete unit'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
