import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { X, MapPin, AlertTriangle, Clock, DollarSign, Building2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  calculateTotalRate,
  getAvailableTiers,
  formatPeso,
  resolveLocation,
  computeDurationHours,
} from '../../lib/pricingEngine';
import type {
  Asset,
  PricingTier,
  BorrowLocation,
  Item,
  PriceEstimate,
} from '../../types/inventory';

interface BorrowingModalProps {
  asset: Asset;
  pricing: PricingTier[];
  availableItems: Item[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BorrowingModal({
  asset,
  pricing,
  availableItems,
  onClose,
  onSuccess,
}: BorrowingModalProps) {
  const canChooseLocation = asset.location_mode === 'both';
  const defaultLocation: BorrowLocation =
    asset.location_mode === 'inside_only' ? 'inside' : 'outside';

  const [location, setLocation] = useState<BorrowLocation>(defaultLocation);
  const [destinationLocation, setDestinationLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Resolved location
  const resolvedLoc = resolveLocation(asset, location);

  // Dynamic placeholder based on usage type
  const destinationPlaceholder = resolvedLoc === 'inside'
    ? 'e.g., Room 204, Coworking Area, Studio B'
    : 'e.g., MSU-IIT Campus, Client Office, Iligan Tech Park';

  // Price estimate
  const estimate: PriceEstimate | null = useMemo(() => {
    if (!startTime || !endTime) return null;
    return calculateTotalRate(pricing, asset, location, startTime, endTime);
  }, [pricing, asset, location, startTime, endTime]);

  // Tiers for display
  const tiers = useMemo(
    () => getAvailableTiers(pricing, asset, location),
    [pricing, asset, location]
  );

  // Duration display
  const durationText = useMemo(() => {
    if (!startTime || !endTime) return null;
    const h = computeDurationHours(startTime, endTime);
    if (h <= 0) return null;
    if (h < 24) return `${h.toFixed(1)} hrs`;
    const days = h / 24;
    return `${days.toFixed(1)} days (${h.toFixed(0)} hrs)`;
  }, [startTime, endTime]);

  // Min datetime for inputs
  const nowISO = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  // Auto-set end time when start changes if end is empty
  useEffect(() => {
    if (startTime && !endTime) {
      const d = new Date(startTime);
      d.setHours(d.getHours() + (tiers[0]?.duration_hours ?? 1));
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setEndTime(local.toISOString().slice(0, 16));
    }
  }, [startTime]);

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      toast.error('Please select start and end times.');
      return;
    }
    if (!destinationLocation.trim()) {
      toast.error('Please specify the location/destination for this equipment.');
      return;
    }
    if (!estimate) {
      toast.error('Cannot calculate price. Please adjust dates.');
      return;
    }
    if (availableItems.length === 0) {
      toast.error('No available units.');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to borrow equipment.');
        setSubmitting(false);
        return;
      }

      // Pick the first available item
      const item = availableItems[0];

      const { error } = await supabase.from('borrowings').insert({
        user_id: user.id,
        item_id: item.id,
        asset_id: asset.id,
        usage_type: resolvedLoc,
        destination_location: destinationLocation.trim(),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_hours: estimate.durationHours,
        matched_tier_hours: estimate.matchedTier.duration_hours,
        total_price: estimate.totalPrice,
        purpose: purpose || null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Borrowing request submitted!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit borrowing request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Borrow {asset.name}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Mandatory notice */}
          {asset.requires_notice && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 font-medium">{asset.requires_notice}</p>
            </div>
          )}

          {/* Location toggle */}
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
                  Use Inside Hub
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
                  Bring Outside
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                {asset.location_mode === 'inside_only'
                  ? '📍 This equipment can only be used inside DCIH.'
                  : '📍 This equipment is for outside use only.'}
              </p>
            )}
          </div>

          {/* Destination Location */}
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
              Where exactly will this equipment be used?
            </p>
          </div>

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

          {/* Real-time price estimator */}
          {estimate && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium">Estimated Total</span>
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
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Rate Card ({resolvedLoc === 'inside' ? 'Inside Hub' : 'Outside'})
              </p>
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
            </div>
          )}

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Video shoot, Photography session"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !estimate}
            className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
