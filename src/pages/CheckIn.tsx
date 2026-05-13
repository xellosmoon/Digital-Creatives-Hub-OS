import { useState, useEffect, useCallback } from 'react';
import {
  Phone, ArrowRight, ArrowLeft, CheckCircle,
  Music, Film, Palette, Gamepad2, PenTool, BookOpen,
  Megaphone, Landmark, Drama, Shield, Clock,
  Sparkles, UserCheck, ShieldCheck, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { PCIDA_DOMAINS } from '../types/hub';
import type { PCIDADomain } from '../types/hub';

// ── PCIDA Domain icons & colors ──────────────────────────────────
const DOMAIN_META: Record<PCIDADomain, { icon: React.ComponentType<{ className?: string }>; gradient: string }> = {
  'Audio & Music': { icon: Music, gradient: 'from-rose-500 to-pink-600' },
  'Film & Animation': { icon: Film, gradient: 'from-violet-500 to-purple-600' },
  'Visual Arts': { icon: Palette, gradient: 'from-amber-500 to-orange-600' },
  'Digital Interactive Media': { icon: Gamepad2, gradient: 'from-cyan-500 to-blue-600' },
  'Design': { icon: PenTool, gradient: 'from-emerald-500 to-teal-600' },
  'Publishing': { icon: BookOpen, gradient: 'from-indigo-500 to-blue-600' },
  'Advertising': { icon: Megaphone, gradient: 'from-fuchsia-500 to-pink-600' },
  'Cultural & Heritage': { icon: Landmark, gradient: 'from-yellow-500 to-amber-600' },
  'Performing Arts': { icon: Drama, gradient: 'from-red-500 to-rose-600' },
};

type Step = 'privacy' | 'mobile' | 'identity' | 'professional' | 'domain';

// ══════════════════════════════════════════════════════════════════
export default function CheckIn() {
  const [step, setStep] = useState<Step>('privacy');
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null); // ID of submitted attendance
  const [isReturning, setIsReturning] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [form, setForm] = useState({
    mobile: '',
    name: '',
    gender: '' as string,
    email: '',
    sector: '',
    organization: '',
    designation: '',
    domain: '' as string,
  });

  const update = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  // ── Check returning user when mobile is entered ─────────────────
  const checkReturning = useCallback(async (mobile: string) => {
    if (mobile.length < 10) return;
    try {
      const { data } = await supabase.rpc('find_returning_user', { p_mobile: mobile });
      if (data && data.length > 0) {
        const user = data[0];
        setIsReturning(true);
        update({
          name: user.full_name || '',
          email: user.email || '',
          gender: user.gender || '',
          sector: user.sector || '',
          organization: user.organization || '',
          designation: user.designation || '',
          domain: user.creative_domain || '',
        });
      } else {
        setIsReturning(false);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Number Pad Logic ────────────────────────────────────────────
  const appendDigit = (d: string) => {
    if (form.mobile.length < 11) {
      const newMobile = form.mobile + d;
      update({ mobile: newMobile });
      if (newMobile.length === 11) {
        checkReturning(newMobile);
      }
    }
  };
  const deleteDigit = () => update({ mobile: form.mobile.slice(0, -1) });

  // ── Navigation ─────────────────────────────────────────────────
  const STEPS: Step[] = ['privacy', 'mobile', 'identity', 'professional', 'domain'];

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    // Returning users: skip from mobile straight to domain (last step before submit)
    if (step === 'mobile' && isReturning) {
      setStep('domain');
      return;
    }
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goPrev = () => {
    const idx = STEPS.indexOf(step);
    if (step === 'domain' && isReturning) {
      setStep('mobile');
      return;
    }
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  // ── Validation ──────────────────────────────────────────────────
  const canProceed = (): boolean => {
    switch (step) {
      case 'privacy': return privacyConsent;
      case 'mobile': return form.mobile.length >= 10;
      case 'identity': return !!form.name.trim();
      case 'professional': return true; // all optional
      case 'domain': return !!form.domain;
    }
  };

  // ── Submit (last step = domain, then goes to pending) ──────────
  const handleSubmit = async () => {
    if (!canProceed()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('hub_attendance').insert({
        mobile_number: form.mobile,
        full_name: form.name,
        gender: form.gender || null,
        email: form.email || null,
        sector: form.sector || null,
        organization: form.organization || null,
        designation: form.designation || null,
        creative_domain: form.domain,
        status: 'pending_entrance',
        privacy_consented: true,
        consent_timestamp: new Date().toISOString(),
        is_walk_in: false,
      }).select('id').single();

      if (error) throw error;
      setPendingId(data.id);
      toast.success('Please proceed to the front desk!');
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Poll for Secretariat confirmation ──────────────────────────
  useEffect(() => {
    if (!pendingId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('hub_attendance')
          .select('status')
          .eq('id', pendingId)
          .single();
        if (data?.status === 'active') {
          clearInterval(interval);
          toast.success('Welcome to the Hub!');
          // Show confirmed for 4s then reset
          setTimeout(() => {
            setPendingId(null);
            setStep('privacy');
            setPrivacyConsent(false);
            setForm({ mobile: '', name: '', gender: '', email: '', sector: '', organization: '', designation: '', domain: '' });
            setIsReturning(false);
          }, 4000);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [pendingId]);

  // ── Pending Screen — awaiting Secretariat confirmation ─────────
  if (pendingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-4">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-black/20 border border-white/20 p-10 sm:p-16 text-center max-w-md w-full">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30 animate-pulse">
            <Clock className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Almost There!</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Please approach the <span className="text-amber-300 font-semibold">Secretariat desk</span> for entrance confirmation.
          </p>
          <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting for confirmation...</span>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ── Glassmorphism Card ── */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-black/20 border border-white/20 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              <span className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider">DCIH Check-In</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {step === 'privacy' && 'Data Privacy Notice'}
              {step === 'mobile' && 'Enter Your Mobile Number'}
              {step === 'identity' && 'Who Are You?'}
              {step === 'professional' && 'Your Work'}
              {step === 'domain' && 'Creative Domain'}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {step === 'privacy' && 'Please read before proceeding'}
              {step === 'mobile' && (isReturning ? 'Welcome back! Tap Continue to skip ahead.' : 'Use the keypad below')}
              {step === 'identity' && 'Tell us your name'}
              {step === 'professional' && 'Optional — helps us serve you better'}
              {step === 'domain' && 'Select your PCIDA sector (RA 11904)'}
            </p>
          </div>

          {/* ═══ STEP 0: DATA PRIVACY CONSENT (RA 10173) ═══ */}
          {step === 'privacy' && (
            <div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 max-h-[50vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-bold text-white">Republic Act 10173</span>
                </div>
                <div className="space-y-3 text-[13px] leading-relaxed text-white/70">
                  <p>
                    The <span className="text-white font-medium">Digital Creatives Innovation Hub (DCIH)</span>, 
                    a DTI Shared Service Facility, collects your personal information for the following purposes:
                  </p>
                  <ul className="space-y-1.5 pl-4">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span><span className="text-white/90 font-medium">DTI SSF Monitoring</span> — Attendance tracking required by the Department of Trade and Industry</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span><span className="text-white/90 font-medium">PCIDA Reporting</span> — Creative industry data per Republic Act 11904</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span><span className="text-white/90 font-medium">Hub Services</span> — To provide you with coworking and creative services</span>
                    </li>
                  </ul>
                  <p className="text-white/50 text-xs border-t border-white/10 pt-3 mt-3">
                    Your data will <span className="text-white/70 font-medium">not</span> be shared with third parties for commercial purposes. 
                    You may request access, correction, or deletion of your data by contacting the Hub Secretariat.
                  </p>
                </div>
              </div>

              {/* Consent Toggle */}
              <button
                type="button"
                onClick={() => setPrivacyConsent(!privacyConsent)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${
                  privacyConsent
                    ? 'bg-emerald-500/20 border-2 border-emerald-400/50'
                    : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                }`}
              >
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  privacyConsent ? 'bg-emerald-500 text-white' : 'bg-white/10'
                }`}>
                  {privacyConsent && <CheckCircle className="h-4 w-4" />}
                </div>
                <span className={`text-sm font-semibold text-left ${privacyConsent ? 'text-emerald-300' : 'text-white/60'}`}>
                  I understand and consent to the collection and use of my data
                </span>
              </button>
            </div>
          )}

          {/* ═══ STEP: MOBILE ═══ */}
          {step === 'mobile' && (
            <div>
              {/* Display */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-violet-300" />
                  <span className="text-xs text-white/40 font-medium">PH Mobile</span>
                </div>
                <p className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-wider min-h-[2.5rem]">
                  {form.mobile || '09XX XXX XXXX'}
                </p>
                {isReturning && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30">
                    <UserCheck className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-300">Returning User</span>
                  </div>
                )}
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (key === '⌫') deleteDigit();
                      else if (key) appendDigit(key);
                    }}
                    disabled={!key}
                    className={`
                      h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-200
                      ${!key ? 'invisible' : key === '⌫'
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 active:scale-95'
                        : 'bg-white/10 text-white hover:bg-white/20 active:scale-95 active:bg-violet-500/30'}
                    `}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP: IDENTITY ═══ */}
          {step === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update({ gender: g })}
                      className={`py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                        form.gender === g
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update({ email: e.target.value })}
                  placeholder="juan@example.com"
                  inputMode="email"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* ═══ STEP: PROFESSIONAL ═══ */}
          {step === 'professional' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Sector</label>
                <select
                  value={form.sector}
                  onChange={e => update({ sector: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none"
                >
                  <option value="" className="bg-gray-900">Select sector...</option>
                  <option value="Government" className="bg-gray-900">Government</option>
                  <option value="Private" className="bg-gray-900">Private</option>
                  <option value="Academic" className="bg-gray-900">Academic</option>
                  <option value="Freelancer" className="bg-gray-900">Freelancer / Independent</option>
                  <option value="Student" className="bg-gray-900">Student</option>
                  <option value="NGO" className="bg-gray-900">NGO / Civil Society</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Organization</label>
                <input
                  type="text"
                  value={form.organization}
                  onChange={e => update({ organization: e.target.value })}
                  placeholder="Company or school name"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Designation / Role</label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={e => update({ designation: e.target.value })}
                  placeholder="e.g. Graphic Designer, Student, Developer"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* ═══ STEP: DOMAIN (3x3 Grid) ═══ */}
          {step === 'domain' && (
            <div className="grid grid-cols-3 gap-2">
              {PCIDA_DOMAINS.map(d => {
                const meta = DOMAIN_META[d];
                const Icon = meta.icon;
                const selected = form.domain === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update({ domain: d })}
                    className={`
                      flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all duration-200
                      ${selected
                        ? `bg-gradient-to-br ${meta.gradient} text-white shadow-lg scale-105`
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:scale-[1.03]'}
                    `}
                  >
                    <Icon className={`h-6 w-6 mb-1.5 ${selected ? 'text-white' : 'text-white/60'}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight">{d}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            {step !== 'privacy' ? (
              <button
                type="button"
                onClick={goPrev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : <div />}

            {step === 'domain' ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {submitting ? 'Submitting...' : 'Submit Check-In'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 shadow-lg shadow-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Branding footer */}
        <p className="text-center text-white/30 text-[10px] mt-4">
          Digital Creatives Innovation Hub — DTI Region XI
        </p>
      </div>
    </div>
  );
}
