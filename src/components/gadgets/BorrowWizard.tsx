import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X, AlertTriangle, Clock, Building2, ExternalLink,
  Plus, Trash2, Search, Printer, CheckCircle, ArrowLeft, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  calculateTotalRate,
  resolveLocation,
  computeDurationHours,
} from '../../lib/pricingEngine';
import type {
  Asset,
  AssetAvailability,
  PricingTier,
  BorrowLocation,
} from '../../types/gadgets';
import ReceivingForm, { type ReceivingFormData } from './ReceivingForm';

interface Selection {
  asset: Asset;
  quantity: number;
  location: BorrowLocation;
  liveAvailable: number | null; // null = not checked yet
}

interface BorrowWizardProps {
  initialAsset: Asset;
  allAssets: AssetAvailability[];
  allPricing: PricingTier[];
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'devices' | 'personal' | 'review' | 'done';

function makeSelection(asset: Asset): Selection {
  const location: BorrowLocation = asset.location_mode === 'inside_only' ? 'inside' : 'outside';
  return { asset, quantity: 1, location, liveAvailable: null };
}

export default function BorrowWizard({
  initialAsset,
  allAssets,
  allPricing,
  onClose,
  onSuccess,
}: BorrowWizardProps): JSX.Element {
  const [step, setStep] = useState<WizardStep>('devices');
  const [selections, setSelections] = useState<Selection[]>([makeSelection(initialAsset)]);
  const [addingAssetId, setAddingAssetId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerOffice, setBorrowerOffice] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [deviceOperatorName, setDeviceOperatorName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [venue, setVenue] = useState('');
  const [lookupMobile, setLookupMobile] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formPages, setFormPages] = useState<ReceivingFormData[] | null>(null);

  const nowISO = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const durationText = useMemo(() => {
    if (!startTime || !endTime) return null;
    const h = computeDurationHours(startTime, endTime);
    if (h <= 0) return null;
    if (h < 24) return `${h.toFixed(1)} hrs`;
    return `${(h / 24).toFixed(1)} days (${h.toFixed(0)} hrs)`;
  }, [startTime, endTime]);

  // Live conflict-aware availability check — replaces the stale
  // "status === available" snapshot with a real query against the
  // chosen time window via the get_available_items RPC.
  const refreshAvailability = useCallback(async () => {
    if (!startTime || !endTime) return;
    const s = new Date(startTime).toISOString();
    const e = new Date(endTime).toISOString();
    if (new Date(e) <= new Date(s)) return;

    setCheckingAvailability(true);
    try {
      const results = await Promise.all(
        selections.map((sel) =>
          supabase.rpc('get_available_items', { p_asset_id: sel.asset.id, p_start: s, p_end: e })
        )
      );
      setSelections((prev) =>
        prev.map((sel, i) => {
          const { data, error } = results[i];
          if (error) {
            console.error('Availability check failed', error);
            return sel;
          }
          const count = (data ?? []).length;
          return { ...sel, liveAvailable: count, quantity: Math.min(sel.quantity, Math.max(1, count)) };
        })
      );
    } finally {
      setCheckingAvailability(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, selections.map((s) => s.asset.id).join(',')]);

  useEffect(() => {
    refreshAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, selections.map((s) => s.asset.id).join(',')]);

  const addableAssets = allAssets.filter(
    (a) => a.availableItems > 0 && !selections.find((s) => s.asset.id === a.asset.id)
  );

  const handleAddAsset = (): void => {
    const found = allAssets.find((a) => a.asset.id === addingAssetId);
    if (!found) return;
    setSelections((prev) => [...prev, makeSelection(found.asset)]);
    setAddingAssetId('');
  };

  const handleRemoveSelection = (assetId: string): void => {
    setSelections((prev) => prev.filter((s) => s.asset.id !== assetId));
  };

  const handleSetQuantity = (assetId: string, quantity: number): void => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.asset.id !== assetId) return s;
        const max = s.liveAvailable ?? 1;
        return { ...s, quantity: Math.max(1, Math.min(quantity, Math.max(1, max))) };
      })
    );
  };

  const handleSetLocation = (assetId: string, location: BorrowLocation): void => {
    setSelections((prev) => prev.map((s) => (s.asset.id === assetId ? { ...s, location } : s)));
  };

  const handleLookup = async (): Promise<void> => {
    if (lookupMobile.trim().length < 10) {
      toast.error('Enter a valid mobile number.');
      return;
    }
    setLookingUp(true);
    try {
      const { data, error } = await supabase.rpc('find_returning_user', { p_mobile: lookupMobile.trim() });
      if (error) throw error;
      if (data && data.length > 0) {
        const found = data[0];
        setBorrowerName(found.full_name ?? '');
        setBorrowerOffice(found.organization ?? '');
        setBorrowerContact(lookupMobile.trim());
        toast.success(`Welcome back, ${found.full_name}!`);
      } else {
        toast.error('No record found for that number — fill in your details below.');
        setBorrowerContact(lookupMobile.trim());
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Lookup failed';
      toast.error(errorMessage);
    } finally {
      setLookingUp(false);
    }
  };

  const canProceedDevices =
    selections.length > 0 &&
    !!startTime &&
    !!endTime &&
    new Date(endTime) > new Date(startTime) &&
    selections.every((s) => (s.liveAvailable ?? 0) >= 1);

  const canProceedPersonal =
    !!borrowerName.trim() && !!borrowerContact.trim() && !!purpose.trim() && !!venue.trim();

  const buildReceivingPages = (): ReceivingFormData[] => {
    const pages: ReceivingFormData[] = [];
    selections.forEach((sel) => {
      for (let i = 0; i < sel.quantity; i++) {
        pages.push({
          borrowerName,
          borrowerOffice,
          borrowerContact,
          purpose,
          startTime: startTime ? new Date(startTime).toISOString() : '',
          endTime: endTime ? new Date(endTime).toISOString() : '',
          venue,
          deviceName: sel.asset.name,
          serialNumber: null,
          includedItems: sel.asset.included_items ?? [],
          lateFeeRate: sel.asset.default_late_fee_rate,
          lateFeeUnit: sel.asset.default_late_fee_unit,
          deviceOperatorName: deviceOperatorName.trim() || borrowerName,
        });
      }
    });
    return pages;
  };

  const goToReview = (): void => {
    setFormPages(buildReceivingPages());
    setStep('review');
  };

  const handlePrint = (): void => {
    window.print();
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();

      let anyReserved = false;
      for (const sel of selections) {
        const resolvedLoc = resolveLocation(sel.asset, sel.location);
        const assetPricing = allPricing.filter((p) => p.asset_id === sel.asset.id);
        const priceEstimate = calculateTotalRate(assetPricing, sel.asset, sel.location, startISO, endISO);

        const { data: availableIds, error: availErr } = await supabase.rpc('get_available_items', {
          p_asset_id: sel.asset.id,
          p_start: startISO,
          p_end: endISO,
        });
        if (availErr) {
          toast.error(`Could not check availability for ${sel.asset.name}.`);
          continue;
        }
        const ids = (availableIds ?? []).map((r: { item_id: string }) => r.item_id).slice(0, sel.quantity);
        if (ids.length < sel.quantity) {
          toast.error(`Only ${ids.length} of ${sel.quantity} requested ${sel.asset.name} unit(s) were available and reserved.`);
        }

        for (const itemId of ids) {
          const { error } = await supabase.from('borrowings').insert({
            user_id: userId,
            item_id: itemId,
            asset_id: sel.asset.id,
            usage_type: resolvedLoc,
            destination_location: venue.trim(),
            start_time: startISO,
            end_time: endISO,
            duration_hours: priceEstimate?.durationHours ?? computeDurationHours(startISO, endISO),
            matched_tier_hours: priceEstimate?.matchedTier.duration_hours ?? 0,
            total_price: priceEstimate?.totalPrice ?? 0,
            purpose: purpose.trim(),
            borrower_name: borrowerName.trim(),
            borrower_office: borrowerOffice.trim() || null,
            borrower_contact: borrowerContact.trim(),
            device_operator_name: deviceOperatorName.trim() || borrowerName.trim(),
            late_fee_rate: sel.asset.default_late_fee_rate,
            late_fee_unit: sel.asset.default_late_fee_unit,
          });
          if (error) {
            // Most likely the DB double-booking guard (23P01) racing another
            // submission for the same unit — surface it instead of failing silently.
            console.error('Failed to reserve unit', error);
            toast.error(`Couldn't reserve one ${sel.asset.name} unit — it may have just been taken.`);
          } else {
            anyReserved = true;
          }
        }
      }

      if (!anyReserved) {
        toast.error('No units could be reserved. Please adjust your request and try again.');
        setSubmitting(false);
        return;
      }

      toast.success('Request submitted! Print your Receiving Form, sign it, and bring it to the Hub desk.');
      setStep('done');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Borrow Equipment</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {step === 'devices' && 'Step 1 of 3 — Devices & time'}
              {step === 'personal' && 'Step 2 of 3 — Your information'}
              {step === 'review' && 'Step 3 of 3 — Review & Receiving Form'}
              {step === 'done' && 'Submitted'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {step === 'devices' && (
            <>
              {selections.map((sel) => {
                const canChooseLocation = sel.asset.location_mode === 'both';
                const resolvedLoc = resolveLocation(sel.asset, sel.location);
                return (
                  <div key={sel.asset.id} className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{sel.asset.name}</h4>
                      {selections.length > 1 && (
                        <button
                          onClick={() => handleRemoveSelection(sel.asset.id)}
                          className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {sel.asset.requires_notice && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{sel.asset.requires_notice}</p>
                      </div>
                    )}

                    {canChooseLocation && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetLocation(sel.asset.id, 'inside')}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
                            sel.location === 'inside'
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <Building2 className="h-3.5 w-3.5" /> Inside Hub
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLocation(sel.asset.id, 'outside')}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
                            sel.location === 'outside'
                              ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Bring Outside
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {resolvedLoc === 'inside' ? 'Inside Hub' : 'Outside'} use
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, sel.liveAvailable ?? 1)}
                          value={sel.quantity}
                          onChange={(e) => handleSetQuantity(sel.asset.id, parseInt(e.target.value, 10) || 1)}
                          className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white text-sm text-center"
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {checkingAvailability
                            ? 'checking…'
                            : sel.liveAvailable == null
                              ? 'set date/time'
                              : `${sel.liveAvailable} free`}
                        </span>
                      </div>
                    </div>
                    {sel.liveAvailable === 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400">No units of this asset are free for the selected window.</p>
                    )}
                  </div>
                );
              })}

              {addableAssets.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={addingAssetId}
                    onChange={(e) => setAddingAssetId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Add another gadget…</option>
                    {addableAssets.map((a) => (
                      <option key={a.asset.id} value={a.asset.id}>{a.asset.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddAsset}
                    disabled={!addingAssetId}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium border border-primary-200 dark:border-primary-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    min={nowISO}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    min={startTime || nowISO}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              {durationText && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" /> Duration: <span className="font-medium">{durationText}</span>
                </div>
              )}
            </>
          )}

          {step === 'personal' && (
            <>
              <div className="rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Already checked in at the Hub? Enter your mobile to autofill your details.
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={lookupMobile}
                    onChange={(e) => setLookupMobile(e.target.value)}
                    placeholder="09xx xxx xxxx"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
                  />
                  <button
                    onClick={handleLookup}
                    disabled={lookingUp}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" /> {lookingUp ? 'Looking up…' : 'Lookup'}
                  </button>
                </div>
              </div>

              <TextField label="Name of Borrower" required value={borrowerName} onChange={setBorrowerName} />
              <TextField label="Office / Agency / Business" value={borrowerOffice} onChange={setBorrowerOffice} />
              <TextField label="Contact Number" required value={borrowerContact} onChange={setBorrowerContact} />
              <TextField label="Purpose of Borrowing" required value={purpose} onChange={setPurpose} />
              <TextField
                label="Venue"
                required
                value={venue}
                onChange={setVenue}
                placeholder="e.g. Room 204, MSU-IIT Campus"
              />
              <TextField
                label="Device Operator (if different from borrower)"
                value={deviceOperatorName}
                onChange={setDeviceOperatorName}
                placeholder={borrowerName || 'Same as borrower'}
              />
            </>
          )}

          {step === 'review' && formPages && (
            <>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
                Review the Receiving Form below, print it, sign it by hand, and submit your request. Bring the
                signed form to the Hub desk — the admin will confirm it before final approval.
              </div>
              <div className="max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-gray-100 dark:bg-slate-900">
                {/* zoom (not transform:scale) — a transform on this ancestor would
                    create a new containing block for the print root's position:fixed,
                    trapping the printed form inside this small scrolling preview box. */}
                <div style={{ zoom: 0.55 }}>
                  <ReceivingForm pages={formPages} />
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <Printer className="h-4 w-4" /> Print Receiving Form{formPages.length > 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 dark:text-white">Request submitted!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Print your Receiving Form, sign it, and bring it to the Hub desk for approval. You can reprint
                it any time from "My Borrows".
              </p>
              <button
                onClick={handlePrint}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
              >
                <Printer className="h-4 w-4" /> Print Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'done' && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'personal') setStep('devices');
                else if (step === 'review') setStep('personal');
                else onClose();
              }}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" /> {step === 'devices' ? 'Cancel' : 'Back'}
            </button>
            {step === 'devices' && (
              <button
                onClick={() => setStep('personal')}
                disabled={!canProceedDevices}
                className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === 'personal' && (
              <button
                onClick={goToReview}
                disabled={!canProceedPersonal}
                className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            )}
          </div>
        )}
        {step === 'done' && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button
              onClick={onSuccess}
              className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}
