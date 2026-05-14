import { useState, useEffect } from 'react';
import { X, Save, Package, Image, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { Asset, AssetCategory, LocationMode, PricingTier } from '../../types/gadgets';
import { CATEGORY_LABELS } from '../../types/gadgets';

interface AssetFormModalProps {
  asset?: Asset | null;          // null = create mode, Asset = edit mode
  onClose: () => void;
  onSuccess: () => void;
}

const LOCATION_MODE_OPTIONS: { value: LocationMode; label: string }[] = [
  { value: 'both', label: 'Both (Inside & Outside)' },
  { value: 'inside_only', label: 'Inside Hub Only' },
  { value: 'outside_only', label: 'Outside Only' },
];

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [AssetCategory, string][];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AssetFormModal({ asset, onClose, onSuccess }: AssetFormModalProps) {
  const isEdit = !!asset;

  const [name, setName] = useState(asset?.name ?? '');
  const [slug, setSlug] = useState(asset?.slug ?? '');
  const [category, setCategory] = useState<AssetCategory>(asset?.category ?? 'computer');
  const [description, setDescription] = useState(asset?.description ?? '');
  const [imageUrl, setImageUrl] = useState(asset?.image_url ?? '');
  const [locationMode, setLocationMode] = useState<LocationMode>(asset?.location_mode ?? 'both');
  const [requiresNotice, setRequiresNotice] = useState(asset?.requires_notice ?? '');
  const [isActive, setIsActive] = useState(asset?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from name (only in create mode)
  useEffect(() => {
    if (!isEdit) {
      setSlug(slugify(name));
    }
  }, [name, isEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        category,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        location_mode: locationMode,
        requires_notice: requiresNotice.trim() || null,
        is_active: isActive,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', asset!.id);
        if (error) throw error;
        toast.success('Asset updated!');
      } else {
        const { error } = await supabase.from('assets').insert(payload);
        if (error) throw error;
        toast.success('Asset created!');
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Asset' : 'Add New Asset'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Huawei IdeaHub"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="huawei-ideahub"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">URL-safe identifier. Auto-generated from name.</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CATEGORY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this equipment…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Image className="inline h-4 w-4 mr-1 -mt-0.5" />
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Location Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline h-4 w-4 mr-1 -mt-0.5" />
              Usage Location
            </label>
            <select
              value={locationMode}
              onChange={(e) => setLocationMode(e.target.value as LocationMode)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {LOCATION_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Mandatory Notice */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <AlertTriangle className="inline h-4 w-4 mr-1 -mt-0.5" />
              Mandatory Notice (optional)
            </label>
            <input
              type="text"
              value={requiresNotice}
              onChange={(e) => setRequiresNotice(e.target.value)}
              placeholder="e.g. Users must bring their own external hard drives."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">
              {isActive ? 'Active (visible to users)' : 'Inactive (hidden from users)'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {submitting ? 'Saving…' : isEdit ? 'Update Asset' : 'Create Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
