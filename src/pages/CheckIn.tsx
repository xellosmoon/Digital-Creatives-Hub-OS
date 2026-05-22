import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, ArrowLeft, CheckCircle,
  Music, Film, Palette, Gamepad2, PenTool, BookOpen,
  Megaphone, Landmark, Drama, Clock,
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
  'Other': { icon: Sparkles, gradient: 'from-gray-500 to-slate-600' },
};

type Step = 'privacy' | 'mobile' | 'identity' | 'professional' | 'purpose' | 'domain' | 'event' | 'agreement';

// ══════════════════════════════════════════════════════════════════
export default function CheckIn(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('privacy');
  const [submitting, setSubmitting] = useState(false);
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
    purpose: '',
    domains: [] as string[],
    eventId: '' as string,
  });

  const [agreementChecks, setAgreementChecks] = useState({
    isRequest: false,
    waitConfirmation: false,
    replyEmail: false,
    noReplyCancel: false,
    noShowAffects: false,
  });
  const [agreementNotes, setAgreementNotes] = useState('');
  const [todayEvents, setTodayEvents] = useState<Array<{ id: string; title: string; start_time: string }>>([]);

  const update = useCallback((patch: Partial<typeof form>): void => setForm(prev => ({ ...prev, ...patch })), []);

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
          domains: user.creative_domain ? [user.creative_domain] : [],
        });
      } else {
        setIsReturning(false);
      }
    } catch {
      // silently fail
    }
  }, [update]);

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

  // ── Fetch today's approved events ─────────────────────────────
  useEffect(() => {
    const fetchTodayEvents = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('events')
        .select('id, title, start_time')
        .eq('status', 'approved')
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: true });
      if (data) setTodayEvents(data);
    };
    fetchTodayEvents();
  }, []);

  // ── Navigation ─────────────────────────────────────────────────
  const STEPS: Step[] = ['privacy', 'mobile', 'identity', 'professional', 'purpose', 'domain', 'event', 'agreement'];

  const goNext = (): void => {
    const idx = STEPS.indexOf(step);
    // Returning users: skip from mobile straight to purpose
    if (step === 'mobile' && isReturning) {
      setStep('purpose');
      return;
    }
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goPrev = (): void => {
    const idx = STEPS.indexOf(step);
    if (step === 'purpose' && isReturning) {
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
      case 'purpose': return !!form.purpose;
      case 'domain': return form.domains.length > 0;
      case 'event': return true; // optional - can skip event selection
      case 'agreement': return Object.values(agreementChecks).every(v => v);
      default: return false;
    }
  };

  // ── Submit (last step = domain, then goes to pending) ──────────
  const handleSubmit = async (): Promise<void> => {
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
        purpose: form.purpose || null,
        creative_domain: form.domains.join(', '),
        event_id: form.eventId || null,
        status: 'pending_entrance',
        privacy_consented: true,
        consent_timestamp: new Date().toISOString(),
        is_walk_in: false,
        notes: agreementNotes || null,
      }).select('id').single();

      if (error) throw error;
      toast.success('Check-in successful! Please proceed to the front desk.');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Check-in failed';
      toast.error(errorMessage);
    } finally {
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
              <span className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider">DCIH Check-In</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {step === 'privacy' && 'Data Privacy Notice'}
              {step === 'mobile' && 'Enter Your Mobile Number'}
              {step === 'identity' && 'Who Are You?'}
              {step === 'professional' && 'Your Work'}
              {step === 'purpose' && 'Purpose of Visit'}
              {step === 'domain' && 'Creative Domain'}
              {step === 'event' && 'Event Attendance'}
              {step === 'agreement' && 'Booking Agreement'}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {step === 'privacy' && 'Please read before proceeding'}
              {step === 'mobile' && (isReturning ? 'Welcome back! Tap Continue to skip ahead.' : 'Use the keypad below')}
              {step === 'identity' && 'Tell us your name'}
              {step === 'professional' && 'Optional — helps us serve you better'}
              {step === 'purpose' && 'What brings you to the hub today?'}
              {step === 'domain' && 'Select your PCIDA sector (RA 11904)'}
              {step === 'event' && 'Optional — select if attending an event'}
              {step === 'agreement' && 'Please read and confirm to proceed'}
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

          {/* ═══ STEP: PURPOSE ═══ */}
          {step === 'purpose' && (
            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 block">Purpose of Visit *</label>
              <select
                value={form.purpose}
                onChange={e => update({ purpose: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="" className="bg-gray-900">Select purpose...</option>
                <option value="Explore the space" className="bg-gray-900">Explore the space</option>
                <option value="Coworking or productivity" className="bg-gray-900">Coworking or productivity</option>
                <option value="Conduct a meeting or session" className="bg-gray-900">Conduct a meeting or session</option>
                <option value="Use available equipment or services" className="bg-gray-900">Use available equipment or services</option>
                <option value="Content creation or digital work" className="bg-gray-900">Content creation or digital work</option>
                <option value="Research or academic purposes" className="bg-gray-900">Research or academic purposes</option>
                <option value="Propose Collaboration" className="bg-gray-900">Propose Collaboration</option>
                <option value="Attend an event in the hub" className="bg-gray-900">Attend an event in the hub</option>
                <option value="Virtual Office Inquiry" className="bg-gray-900">Virtual Office Inquiry</option>
                <option value="Other" className="bg-gray-900">Other</option>
              </select>
            </div>
          )}

          {/* ═══ STEP: DOMAIN (3x3 Grid) ═══ */}
          {step === 'domain' && (
            <div className="grid grid-cols-3 gap-2">
              {PCIDA_DOMAINS.map(d => {
                const meta = DOMAIN_META[d] || { icon: Sparkles, gradient: 'from-gray-500 to-slate-600' };
                const Icon = meta.icon;
                const selected = form.domains.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const newDomains = selected 
                        ? form.domains.filter(domain => domain !== d)
                        : [...form.domains, d];
                      update({ domains: newDomains });
                    }}
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

          {/* ═══ STEP: EVENT ═══ */}
          {step === 'event' && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-xs text-white/60 mb-4">Are you attending a specific event today? Select from the list below or skip to continue.</p>
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => update({ eventId: '' })}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      !form.eventId
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-white'
                        : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-semibold text-sm">None / General Coworking</div>
                    <div className="text-xs text-white/50 mt-0.5">Not attending a specific event</div>
                  </button>

                  {todayEvents.length > 0 ? (
                    todayEvents.map(event => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => update({ eventId: event.id })}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          form.eventId === event.id
                            ? 'bg-emerald-500/20 border-2 border-emerald-500 text-white'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-semibold text-sm">{event.title}</div>
                        <div className="text-xs text-white/50 mt-0.5">
                          {new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-white/40 text-sm">
                      No events scheduled for today
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP: AGREEMENT ═══ */}
          {step === 'agreement' && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-bold text-white">Booking Acknowledgment & Agreement</span>
                </div>
                <p className="text-xs text-white/60 mb-4">Please read and confirm the following to proceed with your booking request</p>
                
                <div className="space-y-3">
                  {[
                    { key: 'isRequest', text: 'I understand that submitting this form is a booking request only and does not guarantee approval.' },
                    { key: 'waitConfirmation', text: 'I understand that I must wait for a confirmation email from the Digital Creatives Hub before my visit.' },
                    { key: 'replyEmail', text: 'I agree to reply to the confirmation email to confirm my attendance.' },
                    { key: 'noReplyCancel', text: 'I understand that failure to reply to the confirmation email may result in automatic cancellation of my booking.' },
                    { key: 'noShowAffects', text: 'I understand that no-show visits may affect future booking approvals.' },
                  ].map(({ key, text }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAgreementChecks(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                        agreementChecks[key as keyof typeof agreementChecks]
                          ? 'bg-emerald-500/20 border-2 border-emerald-400/50'
                          : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        agreementChecks[key as keyof typeof agreementChecks] ? 'bg-emerald-500 text-white' : 'bg-white/10'
                      }`}>
                        {agreementChecks[key as keyof typeof agreementChecks] && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                      <span className={`text-xs ${agreementChecks[key as keyof typeof agreementChecks] ? 'text-emerald-200' : 'text-white/70'}`}>
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Additional Notes (Optional)</label>
                <textarea
                  value={agreementNotes}
                  onChange={e => setAgreementNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                />
              </div>
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

            {step === 'agreement' ? (
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
          Digital Creatives Innovation Hub — DTI Region 10
        </p>
      </div>
    </div>
  );
}
