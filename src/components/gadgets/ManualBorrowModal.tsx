import { useState, useMemo, useEffect } from 'react';
import { X, MapPin, AlertTriangle, Clock, DollarSign, Building2, ExternalLink, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  calculateTotalRate,
  getAvailableTiers,
  formatPeso,
  resolveLocation,
  computeDurationHours,
} from '../../lib/pricingEngine';
import type { Asset, Item, PricingTier, BorrowLocation, PriceEstimate } from '../../types/gadgets';

interface ManualBorrowModalProps {
  assets: Asset[];
  items: Item[];
  pricing: PricingTier[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualBorrowModal({
  assets,
  items,
  pricing,
  onClose,
  onSuccess,
}: ManualBorrowModalProps): JSX.Element {
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [location, setLocation] = useState<BorrowLocation>('inside');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const availableItems = items.filter(
    (i) => i.asset_id === selectedAssetId && i.status === 'available'
  );

  // Reset item selection when asset changes
  useEffect(() => {
    setSelectedItemId('');
  }, [selectedAssetId]);

  // Auto-set location based on asset
  useEffect(() => {
    if (selectedAsset) {
      if (selectedAsset.location_mode === 'inside_only') setLocation('inside');
      else if (selectedAsset.location_mode === 'outside_only') setLocation('outside');
    }
  }, [selectedAsset]);

  const canChooseLocation = selectedAsset?.location_mode === 'both';
  const resolvedLoc = selectedAsset ? resolveLocation(selectedAsset, location) : location;

  // Dynamic placeholder based on usage type
  const destinationPlaceholder = resolvedLoc === 'inside'
    ? 'e.g., Room 204, Coworking Area, Studio B'
    : 'e.g., MSU-IIT Campus, Client Office, Iligan Tech Park';

  // Now ISO for min
  const nowISO = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const assetPricing = pricing.filter((p) => p.asset_id === selectedAssetId);

  const estimate: PriceEstimate | null = useMemo(() => {
    if (!startTime || !endTime || !selectedAsset) return null;
    return calculateTotalRate(assetPricing, selectedAsset, location, startTime, endTime);
  }, [assetPricing, selectedAsset, location, startTime, endTime]);

  const tiers = useMemo(() => {
    if (!selectedAsset) return [];
    return getAvailableTiers(assetPricing, selectedAsset, location);
  }, [assetPricing, selectedAsset, location]);

  const durationText = useMemo(() => {
    if (!startTime || !endTime) return null;
    const h = computeDurationHours(startTime, endTime);
    if (h <= 0) return null;
    if (h < 24) return `${h.toFixed(1)} hrs`;
    return `${(h / 24).toFixed(1)} days (${h.toFixed(0)} hrs)`;
  }, [startTime, endTime]);

  const handleSubmit = async (): Promise<void> => {
    if (!selectedAssetId || !selectedItemId) {
      toast.error('Please select an asset and a specific unit.');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('Please select start and end times.');
      return;
    }
    if (!destinationLocation.trim()) {
      toast.error('Please specify the location/destination for this equipment.');
      return;
    }
    if (!estimate) {
      toast.error('Cannot calculate price. Adjust dates.');
      return;
    }

    setSubmitting(true);
    try {
      // Resolve borrower user_id from email if provided
      const userId: string | null = null;
      if (borrowerEmail.trim()) {
        // Try to find user by email in auth (admin can see via profiles join)
        // Fallback: store null and record the email in notes
      }

      // Get current admin user for approved_by
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      const { error } = await supabase.from('borrowings').insert({
        user_id: userId,
        item_id: selectedItemId,
        asset_id: selectedAssetId,
        usage_type: resolvedLoc,
        destination_location: destinationLocation.trim(),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_hours: estimate.durationHours,
        matched_tier_hours: estimate.matchedTier.duration_hours,
        total_price: estimate.totalPrice,
        status: 'active', // Manual borrow = immediately active
        purpose: purpose || null,
        notes: borrowerEmail
          ? `[Walk-in] Borrower: ${borrowerEmail}${notes ? ' | ' + notes : ''}`
          : notes || null,
        approved_by: adminUser?.id ?? null,
      });

      if (error) throw error;

      toast.success('Manual borrowing created — item is now active!');
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manual borrowing.';
      toast.error(errorMessage);
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
            <UserPlus className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Manual Borrow (Walk-in)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Borrower email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <UserPlus className="inline h-4 w-4 mr-1 -mt-0.5" />
              Borrower Email / Name
            </label>
            <input
              type="text"
              value={borrowerEmail}
              onChange={(e) => setBorrowerEmail(e.target.value)}
              placeholder="Walk-in borrower email or name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Asset select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select equipment…</option>
              {assets.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({items.filter((i) => i.asset_id === a.id && i.status === 'available').length} available)
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory notice */}
          {selectedAsset?.requires_notice && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 font-medium">{selectedAsset.requires_notice}</p>
            </div>
          )}

          {/* Unit select */}
          {selectedAssetId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Unit</label>
              {availableItems.length === 0 ? (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">No available units for this asset.</p>
              ) : (
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select unit…</option>
                  {availableItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.asset_tag} — SN: {i.serial_number || 'N/A'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Location toggle */}
          {selectedAsset && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1 -mt-0.5" />
                Usage Location
              </label>
              {canChooseLocation ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocation('inside')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      location === 'inside'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Inside Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation('outside')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      location === 'outside'
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Outside
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {selectedAsset.location_mode === 'inside_only'
                    ? 'This equipment is inside-only.'
                    : 'This equipment is for outside use.'}
                </p>
              )}
            </div>
          )}

          {/* Destination Location */}
          {selectedAsset && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1 -mt-0.5" />
                Specific Location / Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                placeholder={destinationPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Where exactly is this equipment going?
              </p>
            </div>
          )}

          {/* Date / Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input
                type="datetime-local"
                value={startTime}
                min={nowISO}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input
                type="datetime-local"
                value={endTime}
                min={startTime || nowISO}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Duration */}
          {durationText && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              Duration: <span className="font-medium">{durationText}</span>
            </div>
          )}

          {/* Price estimator */}
          {estimate && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Fee</span>
                </div>
                <span className="text-xl font-bold text-green-700">
                  {formatPeso(estimate.totalPrice)}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Tier: {estimate.matchedTier.duration_label} @ {formatPeso(estimate.matchedTier.price)}
              </p>
            </div>
          )}

          {/* Rate card */}
          {tiers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tiers.map((t) => (
                <span
                  key={t.id}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    estimate?.matchedTier.id === t.id
                      ? 'bg-primary-100 border-primary-300 text-primary-700 font-semibold'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {t.duration_label}: {formatPeso(t.price)}
                </span>
              ))}
            </div>
          )}

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Event coverage, Photo shoot"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional details…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
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
            disabled={submitting || !estimate || !selectedItemId}
            className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : 'Assign & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
