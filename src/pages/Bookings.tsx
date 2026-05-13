import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, ArrowRight, Check, Calendar, Clock,
  User, Mail, Phone, FileText, Users, Info,
  AlertTriangle, Package, Star, Tag, Laptop,
  Coffee, Palette, Film, Camera, CheckCircle, AlertCircle,
  Zap, Shield, Monitor, Sparkles, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { calculatePackagePrice, formatPeso } from '../lib/hubPricingEngine';
import type { RentalPackage, HubPriceEstimate, PackageRequiredAsset } from '../types/hub';
import { BUNDLE_SLUGS } from '../types/hub';

// ── Time slot definitions ──────────────────────────────────────────
const HOURS = Array.from({ length: 13 }, (_, i) => {
  const h = i + 8;
  return {
    value: `${String(h).padStart(2, '0')}:00`,
    label: h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
  };
});

// ── Package visual mapping ─────────────────────────────────────────
const PKG_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  coworking_hourly: Laptop,
  student_pass: BookOpen,
  coworker_lite: Coffee,
  weekend_creator: Palette,
  creative_suite: Film,
  production_access: Camera,
};
const PKG_GRAD: Record<string, string> = {
  coworking_hourly: 'from-sky-500 to-blue-600',
  student_pass: 'from-emerald-400 to-teal-600',
  coworker_lite: 'from-amber-400 to-orange-500',
  weekend_creator: 'from-pink-400 to-rose-500',
  creative_suite: 'from-violet-500 to-purple-600',
  production_access: 'from-indigo-500 to-blue-600',
};

// ── Step metadata ──────────────────────────────────────────────────
type Step = 'package' | 'datetime' | 'details' | 'confirm';
const STEP_META: { key: Step; label: string }[] = [
  { key: 'package', label: 'Package' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'details', label: 'Your Info' },
  { key: 'confirm', label: 'Confirm' },
];

// ── Extended package type ──────────────────────────────────────────
interface PkgExtra extends RentalPackage {
  bundleAvailable: boolean;
  requiredAssets: PackageRequiredAsset[];
}

// ════════════════════════════════════════════════════════════════════
export default function Bookings() {
  const location = useLocation();
  const preselected = (location.state as any) ?? {};

  // ── State ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('package');
  const [packages, setPackages] = useState<PkgExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pkg, setPkg] = useState<PkgExtra | null>(null);
  const [availSeats, setAvailSeats] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<HubPriceEstimate | null>(null);

  const [form, setForm] = useState({
    date: preselected.preselectedDate
      ? format(new Date(preselected.preselectedDate), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    start: preselected.preselectedTime || '09:00',
    end: '17:00',
    name: '',
    email: '',
    phone: '',
    purpose: '',
  });

  const isBundle = pkg ? BUNDLE_SLUGS.includes(pkg.slug) : false;
  const isDaily = pkg?.billing_mode === 'daily';
  const stepIdx = STEP_META.findIndex(s => s.key === step);

  // ── Fetch packages ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: pkgs, error } = await supabase
          .from('rental_packages').select('*').eq('is_active', true).order('sort_order');
        if (error) throw error;

        const { data: reqAssets } = await supabase.from('package_required_assets').select('*');

        const enriched: PkgExtra[] = await Promise.all(
          (pkgs || []).map(async (p: RentalPackage) => {
            const assets = (reqAssets || []).filter((a: PackageRequiredAsset) => a.package_id === p.id);
            let bundleAvailable = true;
            if (p.is_bundle) {
              const { data } = await supabase.rpc('check_bundle_availability', { p_package_id: p.id });
              if (data === false) bundleAvailable = false;
            }
            return { ...p, requiredAssets: assets, bundleAvailable };
          })
        );
        setPackages(enriched);

        // Auto-select if coming from quick-book modal
        if (preselected.preselectedPackage) {
          const match = enriched.find(p => p.id === preselected.preselectedPackage);
          if (match) { setPkg(match); setStep('datetime'); }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load packages');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Fetch available seats when date changes ───────────────────────
  useEffect(() => {
    if (!form.date) return;
    (async () => {
      const { data } = await supabase.rpc('get_available_seats', { target_date: form.date });
      setAvailSeats(typeof data === 'number' ? data : null);
    })();
  }, [form.date]);

  // ── Recalculate price ─────────────────────────────────────────────
  useEffect(() => {
    if (!pkg) { setEstimate(null); return; }
    const s = `${form.date}T${form.start}:00`;
    const e = `${form.date}T${form.end}:00`;
    setEstimate(calculatePackagePrice(pkg, s, e));
  }, [pkg, form.date, form.start, form.end]);

  // ── Helpers ───────────────────────────────────────────────────────
  const update = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const canProceed = (): boolean => {
    switch (step) {
      case 'package': return !!pkg;
      case 'datetime': return !!form.date && !!form.start && !!form.end;
      case 'details': return !!form.name.trim() && !!form.email.trim();
      default: return true;
    }
  };

  const next = () => { if (stepIdx < STEP_META.length - 1) setStep(STEP_META[stepIdx + 1].key); };
  const prev = () => { if (stepIdx > 0) setStep(STEP_META[stepIdx - 1].key); };

  const disabledReason = (p: PkgExtra): string | null => {
    if (p.requires_student_flag) return 'Requires verified student status';
    if (p.is_bundle && !p.bundleAvailable) return 'Equipment currently unavailable';
    return null;
  };

  const handleSubmit = async () => {
    if (!pkg || !estimate) return;
    if (availSeats !== null && availSeats <= 0) {
      toast.error('Fully Booked for this date. Your request will be queued for admin review.');
    } else if (availSeats !== null && availSeats < pkg.seats_consumed) {
      toast.error(`Only ${availSeats} seat(s) left — your booking will be queued for admin review.`);
    }
    setSubmitting(true);
    try {
      const startISO = new Date(`${form.date}T${form.start}:00`).toISOString();
      const endISO = new Date(`${form.date}T${form.end}:00`).toISOString();
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;

      const { error } = await supabase.from('hub_bookings').insert({
        user_id: userId,
        package_id: pkg.id,
        guest_name: form.name,
        guest_email: form.email,
        guest_phone: form.phone || null,
        booking_date: form.date,
        start_time: startISO,
        end_time: endISO,
        seats_used: pkg.seats_consumed,
        total_price: estimate.totalPrice,
        status: 'pending',
        purpose: form.purpose || null,
        notes: null,
      });
      if (error) throw error;

      toast.success('Booking submitted! We\u2019ll notify you once approved.');
      setPkg(null);
      setStep('package');
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), start: '09:00', end: '17:00', name: '', email: '', phone: '', purpose: '' });
    } catch (err: any) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* ── Gradient hero strip ── */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 opacity-80" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Book Your Spot</h1>
          </div>
          <p className="text-violet-200 text-sm sm:text-base max-w-lg">
            Reserve a seat at the Digital Creatives Hub — no account needed.
            Pick a package, choose your time, and you&apos;re in.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-16">
        {/* ── Step indicator (glassmorphism card) ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-violet-100/50 border border-white/60 px-4 sm:px-6 py-4 mb-8">
          <div className="flex items-center justify-between">
            {STEP_META.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  {i > 0 && (
                    <div className={`hidden sm:block flex-1 h-0.5 mx-2 rounded transition-colors duration-500 ${done ? 'bg-violet-500' : 'bg-gray-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold
                      transition-all duration-300
                      ${done ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : active ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500' : 'bg-gray-100 text-gray-400'}
                    `}>
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`hidden sm:inline text-sm font-medium transition-colors duration-300 ${active ? 'text-violet-700' : done ? 'text-violet-500' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main grid: content + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ── Left: Step content ── */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-violet-100/30 border border-white/60 p-5 sm:p-8 transition-all duration-300">

              {/* ═══ STEP: PACKAGE ═══ */}
              {step === 'package' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Choose Your Experience</h2>
                  <p className="text-sm text-gray-500 mb-6">Select the package that fits your vibe</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {packages.map(p => {
                      const Icon = PKG_ICON[p.slug] || Laptop;
                      const grad = PKG_GRAD[p.slug] || 'from-gray-500 to-gray-600';
                      const reason = disabledReason(p);
                      const disabled = !!reason;
                      const selected = pkg?.id === p.id;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => setPkg(p)}
                          className={`
                            relative text-left rounded-2xl border-2 p-5
                            transition-all duration-300
                            ${disabled
                              ? 'border-gray-100 bg-gray-50/50 opacity-50 cursor-not-allowed'
                              : selected
                              ? 'border-violet-500 bg-violet-50/60 ring-4 ring-violet-500/20 scale-[1.02] shadow-lg shadow-violet-100'
                              : 'border-gray-200/80 bg-white hover:border-violet-300 hover:shadow-md hover:scale-[1.01]'}
                          `}
                        >
                          {/* Gradient icon */}
                          <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${grad} text-white mb-3 shadow-sm`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Badges */}
                          <div className="absolute top-4 right-4 flex flex-wrap gap-1">
                            {p.is_bundle && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                                <Package className="h-3 w-3 mr-0.5" />Bundle
                              </span>
                            )}
                            {p.requires_student_flag && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                <BookOpen className="h-3 w-3 mr-0.5" />Student
                              </span>
                            )}
                            {p.weekend_only && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
                                <Star className="h-3 w-3 mr-0.5" />Weekends
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-gray-900 text-base pr-16">{p.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>

                          {/* Pricing */}
                          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                            {p.hourly_rate != null && (
                              <span className="text-lg font-extrabold text-gray-900">
                                {formatPeso(p.hourly_rate)}<span className="text-xs font-normal text-gray-400">/hr</span>
                              </span>
                            )}
                            {p.daily_rate != null && p.hourly_rate != null && (
                              <span className="text-xs text-gray-400">or</span>
                            )}
                            {p.daily_rate != null && (
                              <span className={p.hourly_rate ? 'text-sm text-gray-500' : 'text-lg font-extrabold text-gray-900'}>
                                {formatPeso(p.daily_rate)}<span className="text-xs font-normal text-gray-400">/day</span>
                              </span>
                            )}
                          </div>

                          {/* Seats consumed */}
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                            <Users className="h-3.5 w-3.5" />
                            {p.seats_consumed} seat{p.seats_consumed > 1 ? 's' : ''}
                          </div>

                          {/* Bundle included assets */}
                          {p.is_bundle && p.requiredAssets.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                              {p.requiredAssets.map(a => (
                                <span key={a.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {a.quantity_needed}x {a.asset_category.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                          {disabled && reason && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-red-500">
                              <AlertCircle className="h-3.5 w-3.5" /> {reason}
                            </div>
                          )}

                          {selected && (
                            <div className="absolute bottom-4 right-4">
                              <CheckCircle className="h-5 w-5 text-violet-600" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══ STEP: DATETIME ═══ */}
              {step === 'datetime' && pkg && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Pick Your Date & Time</h2>
                  <p className="text-sm text-gray-500 mb-6">When would you like to work at the Hub?</p>

                  {/* Date */}
                  <div className="mb-6">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 text-violet-500" /> Date
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => update({ date: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full sm:w-72 rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-300"
                    />
                  </div>

                  {/* Capacity meter */}
                  {availSeats !== null && (
                    <div className={`mb-6 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 ${
                      availSeats <= 0 ? 'bg-red-50/80' : availSeats <= 5 ? 'bg-amber-50/80' : 'bg-emerald-50/80'
                    }`}>
                      <div className="relative h-14 w-14 flex-shrink-0">
                        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            stroke={availSeats <= 0 ? '#ef4444' : availSeats <= 5 ? '#f59e0b' : '#10b981'}
                            strokeWidth="3"
                            strokeDasharray={`${Math.max(0, Math.round((availSeats / 28) * 100))}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-gray-900">
                          {availSeats}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {availSeats <= 0 ? 'Fully Booked' : `${availSeats} Seat${availSeats > 1 ? 's' : ''} Available`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {availSeats <= 0
                            ? 'You can still submit — admin may approve overflow'
                            : 'out of 28 total hub seats'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Time slot grid — start */}
                  {!isDaily && (
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <Clock className="h-4 w-4 text-violet-500" /> Start Time
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                          {HOURS.slice(0, -1).map(h => {
                            const active = form.start === h.value;
                            return (
                              <button
                                key={h.value}
                                type="button"
                                onClick={() => {
                                  const patch: Partial<typeof form> = { start: h.value };
                                  if (h.value >= form.end) {
                                    const nextIdx = HOURS.findIndex(x => x.value === h.value) + 1;
                                    if (nextIdx < HOURS.length) patch.end = HOURS[nextIdx].value;
                                  }
                                  update(patch);
                                }}
                                className={`
                                  px-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                                  ${active
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-300/50 scale-105'
                                    : 'bg-gray-50 text-gray-700 hover:bg-violet-50 hover:text-violet-700 hover:scale-[1.03]'}
                                `}
                              >
                                {h.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time slot grid — end */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <Clock className="h-4 w-4 text-violet-500" /> End Time
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                          {HOURS.slice(1).map(h => {
                            const active = form.end === h.value;
                            const slotDisabled = h.value <= form.start;
                            return (
                              <button
                                key={h.value}
                                type="button"
                                disabled={slotDisabled}
                                onClick={() => update({ end: h.value })}
                                className={`
                                  px-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                                  ${slotDisabled
                                    ? 'bg-gray-100/60 text-gray-300 cursor-not-allowed line-through'
                                    : active
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-300/50 scale-105'
                                    : 'bg-gray-50 text-gray-700 hover:bg-violet-50 hover:text-violet-700 hover:scale-[1.03]'}
                                `}
                              >
                                {h.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {isDaily && (
                    <div className="rounded-2xl bg-violet-50/80 border border-violet-100 p-4 flex items-center gap-3 text-sm text-violet-700">
                      <Info className="h-5 w-5 flex-shrink-0" />
                      Full-day pass — come and go anytime during operating hours (8 AM - 8 PM).
                    </div>
                  )}

                  {/* Bundle pro-tip */}
                  {isBundle && (
                    <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4 flex items-start gap-3">
                      <Monitor className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-indigo-800">Pro Tip: Bring an External Drive</p>
                        <p className="text-xs text-indigo-600 mt-0.5">
                          Our High-Performance PCs reset after each session. Save your work to an external hard drive or cloud storage.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ STEP: DETAILS ═══ */}
              {step === 'details' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Your Details</h2>
                  <p className="text-sm text-gray-500 mb-6">So we know who to expect at the hub</p>

                  <div className="space-y-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                        <User className="h-4 w-4 text-violet-500" /> Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => update({ name: e.target.value })}
                        placeholder="Juan Dela Cruz"
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                        <Mail className="h-4 w-4 text-violet-500" /> Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => update({ email: e.target.value })}
                        placeholder="juan@example.com"
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                        <Phone className="h-4 w-4 text-violet-500" /> Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => update({ phone: e.target.value })}
                        placeholder="+63 917 123 4567"
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                        <FileText className="h-4 w-4 text-violet-500" /> What will you be working on?
                      </label>
                      <textarea
                        rows={3}
                        value={form.purpose}
                        onChange={e => update({ purpose: e.target.value })}
                        placeholder="Video editing, web development, studying..."
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-300 placeholder:text-gray-300 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP: CONFIRM ═══ */}
              {step === 'confirm' && pkg && estimate && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Confirm</h2>
                  <p className="text-sm text-gray-500 mb-6">Make sure everything looks good</p>

                  <div className="space-y-4">
                    {/* Package summary */}
                    <div className="rounded-2xl bg-gray-50/80 p-4 flex items-center gap-4">
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${PKG_GRAD[pkg.slug] || 'from-gray-500 to-gray-600'} text-white flex items-center justify-center shadow-sm`}>
                        {(() => { const I = PKG_ICON[pkg.slug] || Laptop; return <I className="h-5 w-5" />; })()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{pkg.name}</p>
                        <p className="text-xs text-gray-500">{pkg.seats_consumed} seat{pkg.seats_consumed > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="rounded-2xl bg-gray-50/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-violet-500" />
                        <span className="font-medium text-gray-900">{format(new Date(form.date + 'T00:00'), 'EEE, MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-violet-500" />
                        <span className="font-medium text-gray-900">
                          {isDaily ? 'Full day' : `${HOURS.find(h => h.value === form.start)?.label} \u2013 ${HOURS.find(h => h.value === form.end)?.label}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-500" />
                        <span className="font-extrabold text-gray-900">{formatPeso(estimate.totalPrice)}</span>
                      </div>
                    </div>

                    {/* Personal details */}
                    <div className="rounded-2xl bg-gray-50/80 p-4 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2"><User className="h-4 w-4 text-violet-500" /><span className="text-gray-900">{form.name}</span></div>
                      <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-violet-500" /><span className="text-gray-900">{form.email}</span></div>
                      {form.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-violet-500" /><span className="text-gray-900">{form.phone}</span></div>}
                      {form.purpose && <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-violet-500" /><span className="text-gray-500 italic">{form.purpose}</span></div>}
                    </div>

                    {/* Disclaimer */}
                    <div className="rounded-2xl bg-violet-50/80 border border-violet-100 p-4 flex items-start gap-3 text-xs text-violet-700">
                      <Shield className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
                      <p>
                        Your booking will be <span className="font-semibold">pending approval</span> by a hub admin.
                        You&apos;ll receive a confirmation email once approved. Payment is collected on-site.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Navigation ── */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                {stepIdx > 0 ? (
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : <div />}

                {step === 'confirm' ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {submitting ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {submitting ? 'Submitting...' : 'Confirm Booking'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={next}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ── Right sidebar: Floating price card ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              {/* Price card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-violet-100/30 border border-white/60 p-6 transition-all duration-300">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Booking Summary</h3>

                {pkg ? (
                  <div className="space-y-4">
                    {/* Package icon + name */}
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${PKG_GRAD[pkg.slug] || 'from-gray-500 to-gray-600'} text-white flex items-center justify-center shadow-sm`}>
                        {(() => { const I = PKG_ICON[pkg.slug] || Laptop; return <I className="h-5 w-5" />; })()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{pkg.name}</p>
                        <p className="text-[11px] text-gray-400">{pkg.seats_consumed} seat{pkg.seats_consumed > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="border-t border-dashed border-gray-200 pt-3 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-500">
                        <span>Date</span>
                        <span className="font-medium text-gray-900">{form.date ? format(new Date(form.date + 'T00:00'), 'MMM d') : '\u2014'}</span>
                      </div>
                      {!isDaily && (
                        <div className="flex justify-between text-gray-500">
                          <span>Time</span>
                          <span className="font-medium text-gray-900">
                            {HOURS.find(h => h.value === form.start)?.label} \u2013 {HOURS.find(h => h.value === form.end)?.label}
                          </span>
                        </div>
                      )}
                      {estimate && (
                        <div className="flex justify-between text-gray-500">
                          <span>Rate</span>
                          <span className="text-xs text-gray-400">{estimate.breakdown}</span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold text-gray-500">Total</span>
                        <span className="text-2xl font-extrabold text-gray-900">
                          {estimate ? formatPeso(estimate.totalPrice) : '\u2014'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Payment collected on-site</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Select a package to see pricing</p>
                  </div>
                )}
              </div>

              {/* Compact seat badge */}
              {availSeats !== null && step !== 'package' && (
                <div className={`rounded-2xl p-4 text-center transition-all duration-300 ${
                  availSeats <= 0 ? 'bg-red-50/80' : availSeats <= 5 ? 'bg-amber-50/80' : 'bg-emerald-50/80'
                }`}>
                  <p className={`text-3xl font-extrabold ${
                    availSeats <= 0 ? 'text-red-600' : availSeats <= 5 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{availSeats}</p>
                  <p className="text-xs text-gray-500 mt-0.5">seats available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
