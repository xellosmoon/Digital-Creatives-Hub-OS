import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import {
  ArrowLeft, ArrowRight, Check, Phone, ShieldCheck,
  UserCheck, Sparkles, X, CalendarClock, Building, Palette,
  CheckCircle, Building2, BadgeCheck, Loader2, PartyPopper, Mail, User, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { PCIDA_DOMAINS, PURPOSE_OF_VISIT_OPTIONS, SECTOR_OPTIONS, GENDER_OPTIONS } from '../types/hub';
import ChipGrid, { CHIP_GRADIENTS, CHIP_TINTS } from '../components/shared/ChipGrid';

type Step = 'privacy' | 'event' | 'mobile' | 'identify' | 'purpose' | 'newUser' | 'success';

// Email is one of the hub's main channels for reaching visitors afterward
// (newsletters, event invites), so it's required at check-in — the same
// weight as the mobile number, not an optional nice-to-have.
const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Age is optional, but if someone taps in "500" it should be caught before
// submit rather than silently stored — a blank value is valid (not required).
const isValidAge = (value: string): boolean => {
  if (!value.trim()) return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 120;
};

// ══════════════════════════════════════════════════════════════════
export default function CheckIn(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('privacy');
  const [submitting, setSubmitting] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [form, setForm] = useState({
    mobile: '',
    name: '',
    sector: '',
    creative_domains: [] as string[],
    purpose_of_visit: [] as string[],
    organization: '',
    designation: '',
    email: '',
    gender: '',
    age: '',
  });

  const [foundUser, setFoundUser] = useState<{
    full_name: string;
    sector?: string;
    email?: string;
    gender?: string;
    age?: number;
    organization?: string;
    designation?: string;
    creative_domain?: string;
    creative_domains?: string[];
    purpose_of_visit?: string[];
  } | null>(null);

  const [todayEvents, setTodayEvents] = useState<Array<{ id: string; title: string; start_time: string; end_time: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [editingSector, setEditingSector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingCreativeDomains, setEditingCreativeDomains] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [editingAge, setEditingAge] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);

  const update = useCallback((patch: Partial<typeof form>): void => {
    setForm(prev => ({ ...prev, ...patch }));
    setHasEdits(true);
  }, []);

  // ── Fetch today's events ───────────────────────────────────────────
  // `events` has no `date` column and its status enum is draft/published/
  // cancelled (not approved/confirmed) — match the same table/values the
  // public Events page queries, or this silently returns nothing.
  const fetchTodayEvents = useCallback(async (): Promise<void> => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('status', 'published')
        .lt('start_time', todayEnd)
        .gte('end_time', todayStart)
        .order('start_time');

      if (error) throw error;
      setTodayEvents(data || []);
    } catch (err) {
      console.error('Error fetching today\'s events:', err);
    }
  }, []);

  // Fetch once on mount — needed before the privacy step's "Continue" button
  // decides whether to route into the event-selection step at all.
  useEffect(() => {
    fetchTodayEvents();
  }, [fetchTodayEvents]);

  // ── Check returning user when mobile is entered ─────────────────
  // Every branch below clears purpose_of_visit "ask every time" — except
  // an event picked on the earlier event step must survive that clear, or
  // it silently reappears as an unfilled required field later.
  const checkReturning = useCallback(async (mobile: string) => {
    if (mobile.length < 10) return;
    const resetPurpose = selectedEventId ? ['Event'] : [];
    try {
      const { data } = await supabase.rpc('find_returning_user', { p_mobile: mobile });
      if (data && data.length > 0) {
        const user = data[0];
        // find_returning_user's `creative_domain` is a legacy single value
        // already cast to an array by the RPC (ARRAY[creative_domain]::TEXT[]),
        // so it's `[]`/`[null]` for older rows, never a plain string despite
        // the name. Treating it as a string and re-wrapping it (the old code
        // here did `[user.creative_domain]`) produced a nested [[null]] that
        // crashed anything reading this column downstream — filter to real
        // strings instead of assuming the shape.
        const rawDomains: unknown[] = user.creative_domains?.length ? user.creative_domains : (user.creative_domain || []);
        const cleanDomains = rawDomains.filter((d): d is string => typeof d === 'string' && d.trim().length > 0);

        setFoundUser({
          full_name: user.full_name || '',
          sector: user.sector || '',
          email: user.email || '',
          gender: user.gender || '',
          age: user.age || undefined,
          organization: user.organization || '',
          designation: user.designation || '',
          creative_domain: cleanDomains[0] || '',
          creative_domains: cleanDomains,
        });
        setForm(prev => ({
          ...prev,
          name: user.full_name || '',
          sector: user.sector || '',
          creative_domains: cleanDomains,
          purpose_of_visit: resetPurpose,
          organization: user.organization || '',
          designation: user.designation || '',
          email: user.email || '',
          gender: user.gender || '',
          age: user.age?.toString() || '',
        }));
        setStep('identify');
      } else {
        setFoundUser(null);
        setForm(prev => ({
          ...prev,
          sector: '',
          creative_domains: [],
          purpose_of_visit: resetPurpose,
          organization: '',
          designation: '',
          email: '',
          gender: '',
          age: '',
        }));
        setStep('newUser');
      }
    } catch {
      setFoundUser(null);
      setForm(prev => ({
        ...prev,
        sector: '',
        creative_domains: [],
        purpose_of_visit: resetPurpose,
        organization: '',
        designation: '',
        email: '',
        gender: '',
        age: '',
      }));
      setStep('newUser');
    }
  }, [selectedEventId]);

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
    if (step === 'privacy') setStep(todayEvents.length > 0 ? 'event' : 'mobile');
    else if (step === 'event') setStep('mobile');
  };

  const goBack = (): void => {
    if (step === 'event') {
      setStep('privacy');
    } else if (step === 'mobile') {
      if (todayEvents.length > 0) {
        setStep('event');
      } else {
        navigate('/');
      }
    } else if (step === 'identify') {
      setForm({
        mobile: form.mobile,
        name: '',
        sector: '',
        creative_domains: [],
        purpose_of_visit: selectedEventId ? ['Event'] : [],
        organization: '',
        designation: '',
        email: '',
        gender: '',
        age: '',
      });
      setFoundUser(null);
      setStep('mobile');
    } else if (step === 'purpose') {
      setStep('identify');
      setSelectedEventId(null);
      if (form.purpose_of_visit.length === 1 && form.purpose_of_visit[0] === 'Event') {
        update({ purpose_of_visit: [] });
      }
    } else if (step === 'newUser') {
      setForm({
        mobile: '',
        name: '',
        sector: '',
        creative_domains: [],
        purpose_of_visit: selectedEventId ? ['Event'] : [],
        organization: '',
        designation: '',
        email: '',
        gender: '',
        age: '',
      });
      setFoundUser(null);
      setStep('mobile');
    }
  };

  const handleYesThisIsMe = (): void => {
    setStep('purpose');
  };

  // Picking a specific event locks purpose-of-visit to "Event" — no need to
  // also ask them to pick from the general purpose chips. Switching back to
  // "Just visiting" only clears that auto-picked purpose, never a manual one.
  const handleSelectEvent = (eventId: string | null): void => {
    setSelectedEventId(eventId);
    if (eventId) {
      update({ purpose_of_visit: ['Event'] });
    } else if (form.purpose_of_visit.length === 1 && form.purpose_of_visit[0] === 'Event') {
      update({ purpose_of_visit: [] });
    }
  };

  const handleNotMe = (): void => {
    // Keep the phone number, just let them enter their own name
    setFoundUser(null);
    setForm(prev => ({
      ...prev,
      name: '',
      sector: '',
      creative_domains: [],
      purpose_of_visit: selectedEventId ? ['Event'] : [],
      organization: '',
      designation: '',
      email: '',
      gender: '',
      age: '',
    }));
    setStep('newUser');
  };

  // ── Submit Check-In ────────────────────────────────────────────
  const handleCheckIn = async (): Promise<void> => {
    // Validate purpose of visit is always required
    if (form.purpose_of_visit.length === 0) {
      toast.error('Please select at least one purpose of visit');
      return;
    }
    if (!isValidEmail(effectiveEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!isValidAge(form.age)) {
      toast.error('Please enter a valid age (1–120)');
      return;
    }

    setSubmitting(true);
    try {
      // If returning user made edits, update their most recent record first
      if (foundUser && hasEdits) {
        const updateData: {
          full_name?: string;
          sector?: string;
          creative_domains?: string[];
          purpose_of_visit?: string[];
          organization?: string;
          designation?: string;
          email?: string;
          gender?: string;
          age?: number;
        } = {};
        if (form.name) updateData.full_name = form.name;
        if (form.sector) updateData.sector = form.sector;
        if (form.creative_domains.length > 0) updateData.creative_domains = form.creative_domains;
        if (form.purpose_of_visit.length > 0) updateData.purpose_of_visit = form.purpose_of_visit;
        if (form.organization) updateData.organization = form.organization;
        if (form.designation) updateData.designation = form.designation;
        if (form.email) updateData.email = form.email;
        if (form.gender) updateData.gender = form.gender;
        if (form.age) updateData.age = parseInt(form.age);

        const { error: updateError } = await supabase
          .from('hub_attendance')
          .update(updateData)
          .eq('mobile_number', form.mobile)
          .order('check_in_time', { ascending: false })
          .limit(1);

        if (updateError) console.error('Failed to update user record:', updateError);
      }

      const { error } = await supabase.from('hub_attendance').insert({
        mobile_number: form.mobile,
        full_name: form.name || foundUser?.full_name,
        sector: form.sector || foundUser?.sector || null,
        creative_domains: form.creative_domains.length > 0 ? form.creative_domains : (foundUser?.creative_domains || null),
        purpose_of_visit: form.purpose_of_visit, // Always use current selection (required)
        organization: form.organization || foundUser?.organization || null,
        designation: form.designation || foundUser?.designation || null,
        email: form.email || foundUser?.email || null,
        gender: form.gender || foundUser?.gender || null,
        age: form.age ? parseInt(form.age) : (foundUser?.age || null),
        event_id: selectedEventId || null, // Include selected event if any
        status: 'pending_entrance',
        privacy_consented: true,
        consent_timestamp: new Date().toISOString(),
        is_walk_in: !foundUser,
      });

      if (error) throw error;
      setStep('success');
      setSubmitting(false);
      setHasEdits(false);
      setSelectedEventId(null); // Reset event selection
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Check-in failed';
      toast.error(errorMessage);
      setSubmitting(false);
    }
  };

  // ── Confetti Effect on Success ───────────────────────────────────
  useEffect(() => {
    if (step === 'success') {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = (): void => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#14b8a6', '#8b5cf6', '#6366f1']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#14b8a6', '#8b5cf6', '#6366f1']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Navigate back to privacy notice after celebration
      const timer = setTimeout(() => {
        setForm({
          mobile: '',
          name: '',
          sector: '',
          creative_domains: [],
          purpose_of_visit: [],
          organization: '',
          designation: '',
          email: '',
          gender: '',
          age: '',
        });
        setFoundUser(null);
        setStep('privacy');
      }, duration + 500);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // Returning visitors can have an email already on file (foundUser) or one
  // just typed this visit (form) — either satisfies the requirement.
  const effectiveEmail = (form.email || foundUser?.email || '').trim();

  // Radio-style single-select: pass a 1-item `selected` array and have
  // `onSelect` replace the value outright (never toggle it back off).
  const renderSingleSelectChips = (
    options: readonly string[],
    value: string,
    onSelect: (value: string) => void,
    size: 'sm' | 'lg' = 'lg'
  ): JSX.Element => (
    <ChipGrid options={options} selected={value ? [value] : []} onSelect={onSelect} size={size} />
  );

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <>
      <Helmet>
        <title>Check-In - Digital Creatives Hub Iligan</title>
        <meta name="description" content="Walk-in check-in kiosk for Digital Creatives Hub Iligan. Register your visit and check into available events." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-600 dark:from-fuchsia-900 dark:via-violet-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ── Bright kiosk card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-black/30 border-4 border-white/50 dark:border-slate-700/60 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md mb-3">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">DCIH Check-In Kiosk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-300 dark:to-fuchsia-300 bg-clip-text text-transparent">
              {step === 'privacy' && 'Data Privacy Notice'}
              {step === 'event' && "Joining Today's Event?"}
              {step === 'mobile' && 'Enter Your Mobile Number'}
              {step === 'identify' && 'Is this you?'}
              {step === 'purpose' && (selectedEventId ? 'Confirm Your Details' : 'What brings you here?')}
              {step === 'newUser' && 'Welcome!'}
              {step === 'success' && 'Welcome to the Hub!'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/50 mt-1 font-medium">
              {step === 'privacy' && 'Please read before proceeding'}
              {step === 'event' && 'Select an event, or continue as a general visit'}
              {step === 'mobile' && 'Use the keypad below or type on keyboard'}
              {step === 'identify' && 'We found a previous visitor with this number'}
              {step === 'purpose' && (selectedEventId ? "You're all set — review your info below" : 'Select all that apply')}
              {step === 'newUser' && 'Let us know your name'}
              {step === 'success' && '🎉'}
            </p>
          </div>

          {/* ═══ STEP 0: DATA PRIVACY CONSENT (RA 10173) ═══ */}
          {step === 'privacy' && (
            <div>
              <div className="bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-5 max-h-[50vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-bold text-slate-800 dark:text-white">Republic Act 10173</span>
                </div>
                <div className="space-y-3 text-[13px] leading-relaxed text-slate-600 dark:text-white/70">
                  <p>
                    The <span className="text-slate-900 dark:text-white font-semibold">Digital Creatives Innovation Hub (DCIH)</span>,
                    a DTI Shared Service Facility, collects your personal information for the following purposes:
                  </p>
                  <ul className="space-y-1.5 pl-4">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span><span className="text-slate-900 dark:text-white/90 font-semibold">DTI SSF Monitoring</span> — Attendance tracking required by the Department of Trade and Industry</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span><span className="text-slate-900 dark:text-white/90 font-semibold">PCIDA Reporting</span> — Creative industry data per Republic Act 11904</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span><span className="text-slate-900 dark:text-white/90 font-semibold">Hub Services</span> — To provide you with coworking and creative services</span>
                    </li>
                  </ul>
                  <p className="text-slate-400 dark:text-white/50 text-xs border-t border-violet-200 dark:border-white/10 pt-3 mt-3">
                    Your data will <span className="text-slate-600 dark:text-white/70 font-medium">not</span> be shared with third parties for commercial purposes.
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
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-400'
                    : 'bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-white/20'
                }`}
              >
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  privacyConsent ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10'
                }`}>
                  {privacyConsent && <CheckCircle className="h-4 w-4" />}
                </div>
                <span className={`text-sm font-semibold text-left ${privacyConsent ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-white/60'}`}>
                  I understand and consent to the collection and use of my data
                </span>
              </button>
            </div>
          )}

          {/* ═══ STEP: TODAY'S EVENT ═══ */}
          {step === 'event' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-400/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PartyPopper className="h-5 w-5 text-amber-500" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">Are you here for one of today's events?</p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(null)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selectedEventId === null
                        ? 'bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-400 text-amber-800 dark:text-amber-200'
                        : 'bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-amber-300 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedEventId === null ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'
                      }`}>
                        {selectedEventId === null && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">No, just visiting / general purpose</p>
                      </div>
                    </div>
                  </button>
                  {todayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSelectEvent(event.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedEventId === event.id
                          ? 'bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-400 text-amber-800 dark:text-amber-200'
                          : 'bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-amber-300 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedEventId === event.id ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'
                        }`}>
                          {selectedEventId === event.id && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-slate-400 dark:text-white/50">
                            {format(new Date(event.start_time), 'h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedEventId && (
                <p className="text-center text-xs text-slate-400 dark:text-white/40">
                  Your purpose of visit will be set to "Event" — no need to pick from the other options later.
                </p>
              )}
            </div>
          )}

          {/* ═══ STEP: MOBILE ═══ */}
          {step === 'mobile' && (
            <div>
              {/* Display with Input */}
              <div className="bg-violet-50 dark:bg-white/5 border-2 border-violet-200 dark:border-white/10 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-violet-500" />
                  <span className="text-xs text-slate-500 dark:text-white/40 font-semibold">PH Mobile</span>
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
                  className="w-full bg-transparent text-3xl sm:text-4xl font-mono font-extrabold text-slate-900 dark:text-white tracking-wider text-center focus:outline-none placeholder:text-slate-300 dark:placeholder:text-white/20"
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
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 active:scale-95'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-violet-100 dark:hover:bg-white/20 active:scale-95 active:bg-violet-200 dark:active:bg-violet-500/30'}
                    `}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP: IDENTIFY (Colorful "Is this you?" check) ═══ */}
          {step === 'identify' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-purple-600/20 border-2 border-violet-300 dark:border-violet-400/30 rounded-3xl p-6 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-300/40 to-violet-300/40 dark:from-pink-500/20 dark:to-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-cyan-300/40 to-blue-300/40 dark:from-cyan-500/20 dark:to-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4 shadow-lg shadow-emerald-500/30">
                    <UserCheck className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-200 mb-3">We found this visitor:</p>

                  {/* User info card */}
                  <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-5 border-2 border-violet-200 dark:border-white/20 shadow-md">
                    {editingName ? (
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => update({ name: e.target.value })}
                        onBlur={() => setEditingName(false)}
                        autoFocus
                        className="w-full bg-slate-50 dark:bg-white/10 border-2 border-violet-300 dark:border-white/20 rounded-xl px-3 py-2 text-3xl font-bold text-slate-900 dark:text-white text-center mb-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    ) : (
                      <p
                        className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 cursor-pointer hover:text-violet-600 dark:hover:text-violet-200 transition-colors inline-flex items-center gap-2"
                        onClick={() => setEditingName(true)}
                      >
                        {form.name || foundUser?.full_name}
                        <Pencil className="h-4 w-4 text-slate-300 dark:text-white/30 flex-shrink-0" />
                      </p>
                    )}
                    <p className="text-lg text-violet-600 dark:text-violet-200 mb-3 font-semibold">{form.mobile}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/30 -mt-2 mb-3">Tap your name to correct it</p>

                    {/* Email — same weight as name/phone here, not deferred
                        to a later screen, so there's no confusing dead end
                        after they've already confirmed their identity. */}
                    <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                      {editingEmail ? (
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => update({ email: e.target.value })}
                          onBlur={() => setEditingEmail(false)}
                          autoFocus
                          placeholder="juan@example.com"
                          className="w-full bg-slate-50 dark:bg-white/10 border-2 border-violet-300 dark:border-white/20 rounded-xl px-3 py-2 text-lg font-semibold text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <p
                          className={`text-lg font-semibold cursor-pointer transition-colors inline-flex items-center gap-2 justify-center w-full ${
                            isValidEmail(effectiveEmail) ? 'text-violet-600 dark:text-violet-200 hover:text-violet-800 dark:hover:text-white' : 'text-red-500 dark:text-red-300'
                          }`}
                          onClick={() => setEditingEmail(true)}
                        >
                          {form.email || foundUser?.email || 'Add your email *'}
                          <Pencil className="h-4 w-4 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </p>
                      )}
                      {!isValidEmail(effectiveEmail) && (
                        <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">Required to continue — tap to add</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleYesThisIsMe}
                      disabled={!isValidEmail(effectiveEmail)}
                      className="flex-1 max-w-[180px] px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:shadow-none"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Check className="h-5 w-5" />
                        Yes, this is me
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleNotMe}
                      className="flex-1 max-w-[180px] px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 active:scale-95"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <X className="h-5 w-5" />
                        No, this isn't me
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP: PURPOSE OF VISIT (Colorful selection) ═══ */}
          {step === 'purpose' && (
            <div className="space-y-4">
              {/* Your details (shown only now that identity is confirmed) */}
              {foundUser && (
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-2xl p-5 border-2 border-violet-200 dark:border-white/20 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 dark:text-white/50 uppercase tracking-wider mb-3">
                    Your Details <span className="normal-case font-normal text-slate-300 dark:text-white/30">— tap any field to edit</span>
                  </p>
                  <div className="space-y-3 text-left text-sm">
                    <div className="flex items-start gap-2 text-slate-600 dark:text-white/70">
                      <Building2 className="h-4 w-4 mt-1 text-violet-500 flex-shrink-0" />
                      {editingSector ? (
                        <div className="flex-1">
                          {renderSingleSelectChips(SECTOR_OPTIONS, form.sector, (opt) => { update({ sector: opt }); setEditingSector(false); }, 'sm')}
                        </div>
                      ) : (
                        <span className="flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white" onClick={() => setEditingSector(true)}>
                          {form.sector || foundUser?.sector || 'Add sector'}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                      <Building className="h-4 w-4 text-violet-500" />
                      {editingOrganization ? (
                        <input
                          type="text"
                          value={form.organization}
                          onChange={e => update({ organization: e.target.value })}
                          onBlur={() => setEditingOrganization(false)}
                          autoFocus
                          className="flex-1 bg-slate-50 dark:bg-white/10 border-2 border-violet-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <span className="flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white" onClick={() => setEditingOrganization(true)}>
                          {form.organization || foundUser?.organization || 'Add office/agency/business'}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                      <BadgeCheck className="h-4 w-4 text-violet-500" />
                      {editingDesignation ? (
                        <input
                          type="text"
                          value={form.designation}
                          onChange={e => update({ designation: e.target.value })}
                          onBlur={() => setEditingDesignation(false)}
                          autoFocus
                          className="flex-1 bg-slate-50 dark:bg-white/10 border-2 border-violet-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <span className="flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white" onClick={() => setEditingDesignation(true)}>
                          {form.designation || foundUser?.designation || 'Add designation'}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                      <Mail className="h-4 w-4 text-violet-500" />
                      {editingEmail ? (
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => update({ email: e.target.value })}
                          onBlur={() => setEditingEmail(false)}
                          autoFocus
                          className="flex-1 bg-slate-50 dark:bg-white/10 border-2 border-violet-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <span
                          className={`flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white ${!isValidEmail(effectiveEmail) ? 'text-red-500 dark:text-red-300' : ''}`}
                          onClick={() => setEditingEmail(true)}
                        >
                          {form.email || foundUser?.email || 'Add email *'}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-slate-600 dark:text-white/70">
                      <User className="h-4 w-4 mt-1 text-violet-500 flex-shrink-0" />
                      {editingGender ? (
                        <div className="flex-1">
                          {renderSingleSelectChips(GENDER_OPTIONS, form.gender, (opt) => { update({ gender: opt }); setEditingGender(false); }, 'sm')}
                        </div>
                      ) : (
                        <span className="flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white" onClick={() => setEditingGender(true)}>
                          {form.gender || foundUser?.gender || 'Add gender'}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                      <CalendarClock className="h-4 w-4 text-violet-500" />
                      {editingAge ? (
                        <div className="flex-1">
                          <input
                            type="number"
                            value={form.age}
                            onChange={e => update({ age: e.target.value })}
                            onBlur={() => setEditingAge(false)}
                            placeholder="Age"
                            min="1"
                            max="120"
                            autoFocus
                            className="w-full bg-slate-50 dark:bg-white/10 border-2 border-violet-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
                          />
                          {!isValidAge(form.age) && (
                            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">Enter a real age between 1 and 120</p>
                          )}
                        </div>
                      ) : (
                        <span className="flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white" onClick={() => setEditingAge(true)}>
                          {form.age ? `${form.age} years old` : (foundUser?.age ? `${foundUser.age} years old` : 'Add age')}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-slate-600 dark:text-white/70">
                      <Palette className="h-4 w-4 mt-0.5 text-violet-500 flex-shrink-0" />
                      {editingCreativeDomains ? (
                        <div className="flex-1 flex flex-wrap gap-1.5">
                          {PCIDA_DOMAINS.map((domain, index) => {
                            const isSelected = form.creative_domains.includes(domain);
                            const tintClass = CHIP_TINTS[index % CHIP_TINTS.length];
                            return (
                              <button
                                key={domain}
                                type="button"
                                onClick={() => update({
                                  creative_domains: isSelected
                                    ? form.creative_domains.filter(d => d !== domain)
                                    : [...form.creative_domains, domain]
                                })}
                                className={`px-2 py-1 rounded-lg text-[11px] border-2 transition-all ${
                                  isSelected
                                    ? 'bg-violet-500 border-violet-500 text-white'
                                    : tintClass
                                }`}
                              >
                                {domain}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setEditingCreativeDomains(false)}
                            className="px-2 py-1 rounded-lg text-[11px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-400/40"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 flex items-center gap-1.5 cursor-pointer hover:text-violet-600 dark:hover:text-white" onClick={() => setEditingCreativeDomains(true)}>
                          {form.creative_domains.length > 0
                            ? form.creative_domains.join(', ')
                            : (foundUser?.creative_domains?.length ? foundUser.creative_domains.join(', ') : (foundUser?.creative_domain || 'Add creative domain'))}
                          <Pencil className="h-3 w-3 text-slate-300 dark:text-white/30 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedEventId ? (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-2 border-emerald-300 dark:border-emerald-400/30 rounded-2xl p-4 text-center">
                  <PartyPopper className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-700 dark:text-white/80">
                    Purpose of visit: <span className="font-semibold text-slate-900 dark:text-white">Event</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-white/50 mt-1">
                    You're checking in for {todayEvents.find(e => e.id === selectedEventId)?.title}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PURPOSE_OF_VISIT_OPTIONS.map((purpose, index) => {
                      const isSelected = form.purpose_of_visit.includes(purpose);
                      const colorClass = CHIP_GRADIENTS[index % CHIP_GRADIENTS.length];
                      const tintClass = CHIP_TINTS[index % CHIP_TINTS.length];

                      return (
                        <button
                          key={purpose}
                          type="button"
                          onClick={() => {
                            const newSelection = isSelected
                              ? form.purpose_of_visit.filter(p => p !== purpose)
                              : [...form.purpose_of_visit, purpose];
                            update({ purpose_of_visit: newSelection });
                          }}
                          className={`
                            relative px-4 py-4 rounded-2xl text-left transition-all duration-200 border-2
                            ${isSelected
                              ? `bg-gradient-to-r ${colorClass} text-white shadow-lg scale-[1.02] border-transparent`
                              : tintClass
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'
                            }`}>
                              {isSelected && <Check className="h-4 w-4 text-white" />}
                            </div>
                            <span className="font-semibold text-sm break-words">{purpose}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {form.purpose_of_visit.length === 0 && (
                    <p className="text-center text-sm text-red-500 dark:text-red-400 mt-2">Please select at least one purpose</p>
                  )}
                </>
              )}

              {!isValidEmail(effectiveEmail) && (
                <p className="text-center text-sm text-red-500 dark:text-red-400 mt-2">
                  {effectiveEmail ? 'Please tap the email above and enter a valid address' : 'Please tap the email above and add one — we need it to keep in touch'}
                </p>
              )}
              {!isValidAge(form.age) && (
                <p className="text-center text-sm text-red-500 dark:text-red-400 mt-2">
                  Please tap the age above and enter a real age (1–120)
                </p>
              )}

              <button
                type="button"
                onClick={handleCheckIn}
                disabled={form.purpose_of_visit.length === 0 || !isValidEmail(effectiveEmail) || !isValidAge(form.age) || submitting}
                className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking in...
                  </span>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
          )}

          {/* ═══ STEP: NEW USER ═══ */}
          {step === 'newUser' && (
            <div className="space-y-6">
              <div className="bg-violet-50 dark:bg-white/5 border-2 border-violet-200 dark:border-white/10 rounded-2xl p-6 text-center">
                <Sparkles className="h-12 w-12 text-violet-500 mx-auto mb-3" />
                <p className="text-lg text-slate-700 dark:text-white/80 font-semibold">New here? Welcome!</p>
                <p className="text-sm text-slate-400 dark:text-white/50">Please enter your name to complete registration</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-white/10 border-2 border-slate-200 dark:border-white/20 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update({ email: e.target.value })}
                  placeholder="juan@example.com"
                  className="w-full bg-slate-50 dark:bg-white/10 border-2 border-slate-200 dark:border-white/20 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                {form.email.trim() && !isValidEmail(form.email) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">Please enter a valid email address</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Gender</label>
                {renderSingleSelectChips(GENDER_OPTIONS, form.gender, (opt) => update({ gender: opt }), 'lg')}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Age</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={e => update({ age: e.target.value })}
                  placeholder="25"
                  min="1"
                  max="120"
                  className="w-full bg-slate-50 dark:bg-white/10 border-2 border-slate-200 dark:border-white/20 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/30 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                {form.age.trim() && !isValidAge(form.age) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">Please enter a real age between 1 and 120</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Sector *</label>
                {renderSingleSelectChips(SECTOR_OPTIONS, form.sector, (opt) => update({ sector: opt }), 'lg')}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Creative Domains *</label>
                <p className="text-xs text-slate-400 dark:text-white/40 mb-2">Select all that apply (PCIDA RA 11904)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PCIDA_DOMAINS.map((domain, index) => {
                    const isSelected = form.creative_domains.includes(domain);
                    const colorClass = CHIP_GRADIENTS[index % CHIP_GRADIENTS.length];
                    const tintClass = CHIP_TINTS[index % CHIP_TINTS.length];
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => {
                          update({
                            creative_domains: isSelected
                              ? form.creative_domains.filter(d => d !== domain)
                              : [...form.creative_domains, domain]
                          });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all border-2 ${
                          isSelected
                            ? `bg-gradient-to-r ${colorClass} border-transparent text-white shadow-md`
                            : tintClass
                        }`}
                      >
                        <div className={`h-4 w-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="break-words">{domain}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Purpose of Visit *</label>
                {selectedEventId ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-2 border-emerald-300 dark:border-emerald-400/30 rounded-2xl p-4 text-center">
                    <PartyPopper className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-700 dark:text-white/80">
                      Purpose of visit: <span className="font-semibold text-slate-900 dark:text-white">Event</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-white/50 mt-1">
                      You're checking in for {todayEvents.find(e => e.id === selectedEventId)?.title}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 dark:text-white/40 mb-2">Select all that apply</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PURPOSE_OF_VISIT_OPTIONS.map((purpose, index) => {
                        const isSelected = form.purpose_of_visit.includes(purpose);
                        const colorClass = CHIP_GRADIENTS[index % CHIP_GRADIENTS.length];
                        const tintClass = CHIP_TINTS[index % CHIP_TINTS.length];

                        return (
                          <button
                            key={purpose}
                            type="button"
                            onClick={() => {
                              const newSelection = isSelected
                                ? form.purpose_of_visit.filter(p => p !== purpose)
                                : [...form.purpose_of_visit, purpose];
                              update({ purpose_of_visit: newSelection });
                            }}
                            className={`
                              relative px-4 py-3 rounded-2xl text-left transition-all duration-200 border-2
                              ${isSelected
                                ? `bg-gradient-to-r ${colorClass} text-white shadow-lg scale-[1.02] border-transparent`
                                : tintClass
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                isSelected ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className="font-semibold text-xs break-words">{purpose}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {form.purpose_of_visit.length === 0 && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-2">Please select at least one purpose</p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!form.name.trim() || !isValidEmail(form.email) || !isValidAge(form.age) || !form.sector.trim() || form.creative_domains.length === 0 || form.purpose_of_visit.length === 0 || submitting}
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
                  className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                >
                  Change Number
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP: SUCCESS ═══ */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mb-6 animate-pulse">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {foundUser ? 'Welcome back!' : 'Welcome to the Hub!'}
              </h2>
              <p className="text-4xl mb-4">
                {foundUser ? '👋' : '🎉'}
              </p>
              <p className="text-slate-500 dark:text-white/70 text-sm">
                {foundUser
                  ? 'Great to see you again! You\'re all checked in.'
                  : 'You\'re all checked in! Enjoy your first visit.'}
              </p>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
            {step === 'privacy' ? (
              <div />
            ) : (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}

            {(step === 'privacy' || step === 'event') ? (
              <button
                type="button"
                onClick={goNext}
                disabled={step === 'privacy' && !privacyConsent}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Branding footer */}
        <p className="text-center text-white/70 text-[10px] mt-4 font-medium">
          Digital Creatives Innovation Hub — DTI Region 10
        </p>
      </div>
    </div>
    </>
  );
}
