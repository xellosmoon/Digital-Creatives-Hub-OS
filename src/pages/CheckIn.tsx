import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, ArrowLeft, CheckCircle,
  Sparkles, UserCheck, ShieldCheck, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type Step = 'privacy' | 'mobile' | 'confirm' | 'newUser' | 'success';

// ══════════════════════════════════════════════════════════════════
export default function CheckIn(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('privacy');
  const [submitting, setSubmitting] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [form, setForm] = useState({
    mobile: '',
    name: '',
  });

  const [foundUser, setFoundUser] = useState<{ full_name: string } | null>(null);

  const update = useCallback((patch: Partial<typeof form>): void => setForm(prev => ({ ...prev, ...patch })), []);

  // ── Check returning user when mobile is entered ─────────────────
  const checkReturning = useCallback(async (mobile: string) => {
    if (mobile.length < 10) return;
    try {
      const { data } = await supabase.rpc('find_returning_user', { p_mobile: mobile });
      if (data && data.length > 0) {
        const user = data[0];
        setFoundUser({ full_name: user.full_name || '' });
        setStep('confirm');
      } else {
        setFoundUser(null);
        setStep('newUser');
      }
    } catch {
      setFoundUser(null);
      setStep('newUser');
    }
  }, []);

  // ── Number Pad Logic ────────────────────────────────────────────
  const appendDigit = (d: string): void => {
    if (form.mobile.length < 11) {
      const newMobile = form.mobile + d;
      update({ mobile: newMobile });
      if (newMobile.length === 11) {
        checkReturning(newMobile);
      }
    }
  };
  const deleteDigit = (): void => update({ mobile: form.mobile.slice(0, -1) });

  // ── Physical Keyboard Input Handler ─────────────────────────────
  const handleMobileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    if (value.length <= 11) {
      update({ mobile: value });
      if (value.length === 11) {
        checkReturning(value);
      }
    }
  };

  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && form.mobile.length >= 10) {
      e.preventDefault();
      goNext();
    }
  };

  // ── Navigation ─────────────────────────────────────────────────
  const goNext = (): void => {
    if (step === 'privacy') setStep('mobile');
  };

  const goBack = (): void => {
    if (step === 'newUser') {
      setForm({ mobile: '', name: '' });
      setFoundUser(null);
      setStep('mobile');
    }
  };

  const handleNotMe = (): void => {
    // Keep the phone number, just let them enter their own name
    setFoundUser(null);
    setStep('newUser');
  };

  // ── Submit Check-In ────────────────────────────────────────────
  const handleCheckIn = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('hub_attendance').insert({
        mobile_number: form.mobile,
        full_name: foundUser?.full_name || form.name,
        status: 'pending_entrance',
        privacy_consented: true,
        consent_timestamp: new Date().toISOString(),
        is_walk_in: !foundUser,
      });

      if (error) throw error;
      setStep('success');
      
      // Auto-reset after 3 seconds
      setTimeout(() => {
        setForm({ mobile: '', name: '' });
        setFoundUser(null);
        setStep('mobile');
        setSubmitting(false);
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Check-in failed';
      toast.error(errorMessage);
      setSubmitting(false);
    }
  };

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
              <span className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider">DCIH Check-In Kiosk</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {step === 'privacy' && 'Data Privacy Notice'}
              {step === 'mobile' && 'Enter Your Mobile Number'}
              {step === 'confirm' && 'Is this you?'}
              {step === 'newUser' && 'Welcome!'}
              {step === 'success' && 'Welcome to the Hub!'}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {step === 'privacy' && 'Please read before proceeding'}
              {step === 'mobile' && 'Use the keypad below or type on keyboard'}
              {step === 'confirm' && 'Please confirm your identity'}
              {step === 'newUser' && 'Let us know your name'}
              {step === 'success' && '🎉'}
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
              {/* Display with Input */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-violet-300" />
                  <span className="text-xs text-white/40 font-medium">PH Mobile</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  value={form.mobile}
                  onChange={handleMobileInputChange}
                  onKeyDown={handleMobileKeyDown}
                  autoFocus
                  placeholder="09XX XXX XXXX"
                  className="w-full bg-transparent text-3xl sm:text-4xl font-mono font-bold text-white tracking-wider text-center focus:outline-none placeholder:text-white/20"
                />
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

          {/* ═══ STEP: CONFIRM (Returning User) ═══ */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <UserCheck className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-2xl font-bold text-white mb-1">{foundUser?.full_name}</p>
                <p className="text-sm text-white/50 mb-4">{form.mobile}</p>
                <p className="text-lg text-white/80">Is this you?</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {submitting ? 'Checking in...' : 'Yes, Check In'}
                </button>

                <button
                  type="button"
                  onClick={handleNotMe}
                  className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  Not me - Enter my info
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP: NEW USER ═══ */}
          {step === 'newUser' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <Sparkles className="h-12 w-12 text-violet-400 mx-auto mb-3" />
                <p className="text-lg text-white/80">New here? Welcome!</p>
                <p className="text-sm text-white/50">Please enter your name to complete registration</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!form.name.trim() || submitting}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {submitting ? 'Checking in...' : 'Check In'}
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  Change Number
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP: SUCCESS ═══ */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mb-6">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Hub!</h2>
              <p className="text-white/60">🎉</p>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            {step === 'privacy' ? (
              <div />
            ) : (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}

            {step === 'privacy' ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!privacyConsent}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 shadow-lg shadow-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Branding footer */}
        <p className="text-center text-white/30 text-[10px] mt-4">
          Digital Creatives Innovation Hub — DTI Region 10
        </p>
      </div>
    </div>
  );
}
