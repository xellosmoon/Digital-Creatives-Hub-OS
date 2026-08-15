import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import {
  ArrowLeft, ArrowRight, Check, Phone, ChevronDown, ShieldCheck,
  UserCheck, Sparkles, X, CalendarClock, Building, Coffee, Palette,
  Film, Camera, BookOpen, Monitor, CheckCircle, Plus, ArrowRight as ArrowRightIcon,
  Building2, BadgeCheck, Edit2, Loader2, PartyPopper,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { PCIDA_DOMAINS, PURPOSE_OF_VISIT_OPTIONS } from '../types/hub';

type Step = 'privacy' | 'mobile' | 'identify' | 'purpose' | 'newUser' | 'success';

const SECTOR_OPTIONS = [
  'Teacher/Academe',
  'Government Employee',
  'MSME/Entrepreneur',
  'Private Sector Employee',
  'Freelancer/Remote Worker',
  'Creative Professional',
  'Startup Founder/Innovator',
  'Civil Society/NGO',
  'Student/Researcher',
  'Other'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

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
  });

  const [foundUser, setFoundUser] = useState<{
    full_name: string;
    sector?: string;
    email?: string;
    gender?: string;
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
  const [hasEdits, setHasEdits] = useState(false);

  const update = useCallback((patch: Partial<typeof form>): void => {
    setForm(prev => ({ ...prev, ...patch }));
    setHasEdits(true);
  }, []);

  // ── Fetch today's events ───────────────────────────────────────────
  const fetchTodayEvents = useCallback(async (): Promise<void> => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('date', today)
        .in('status', ['approved', 'confirmed'])
        .order('start_time');

      if (error) throw error;
      setTodayEvents(data || []);
    } catch (err) {
      console.error('Error fetching today\'s events:', err);
    }
  }, []);

  // Fetch today's events when component mounts or when entering purpose step
  useEffect(() => {
    if (step === 'purpose') {
      fetchTodayEvents();
    }
  }, [step, fetchTodayEvents]);

  // ── Check returning user when mobile is entered ─────────────────
  const checkReturning = useCallback(async (mobile: string) => {
    if (mobile.length < 10) return;
    try {
      const { data } = await supabase.rpc('find_returning_user', { p_mobile: mobile });
      if (data && data.length > 0) {
        const user = data[0];
        setFoundUser({
          full_name: user.full_name || '',
          sector: user.sector || '',
          email: user.email || '',
          gender: user.gender || '',
          organization: user.organization || '',
          designation: user.designation || '',
          creative_domain: user.creative_domain || '',
        });
        setForm(prev => ({
          ...prev,
          name: user.full_name || '',
          sector: user.sector || '',
          creative_domains: user.creative_domains || (user.creative_domain ? [user.creative_domain] : []),
          purpose_of_visit: [], // Always clear purpose of visit - ask every time
          organization: user.organization || '',
          designation: user.designation || '',
          email: user.email || '',
          gender: user.gender || '',
        }));
        setStep('identify');
      } else {
        setFoundUser(null);
        setForm(prev => ({
          ...prev,
          sector: '',
          creative_domains: [],
          purpose_of_visit: [],
          organization: '',
          designation: '',
          email: '',
          gender: '',
        }));
        setStep('newUser');
      }
    } catch {
      setFoundUser(null);
      setForm(prev => ({
        ...prev,
        sector: '',
        creative_domains: [],
        purpose_of_visit: [],
        organization: '',
        designation: '',
        email: '',
        gender: '',
      }));
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
    if (step === 'mobile') {
      navigate('/');
    } else if (step === 'identify') {
      setForm({
        mobile: form.mobile,
        name: '',
        sector: '',
        creative_domains: [],
        purpose_of_visit: [],
        organization: '',
        designation: '',
        email: '',
        gender: '',
      });
      setFoundUser(null);
      setStep('mobile');
    } else if (step === 'purpose') {
      setStep('identify');
      setSelectedEventId(null);
    } else if (step === 'newUser') {
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
      });
      setFoundUser(null);
      setStep('mobile');
    }
  };

  const handleYesThisIsMe = (): void => {
    setStep('purpose');
  };

  const handleNotMe = (): void => {
    // Keep the phone number, just let them enter their own name
    setFoundUser(null);
    setForm(prev => ({ 
      ...prev, 
      name: '', 
      sector: '',
      creative_domains: [],
      purpose_of_visit: [],
      organization: '',
      designation: '',
      email: '',
      gender: '',
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

    setSubmitting(true);
    try {
      // If returning user made edits, update their most recent record first
      if (foundUser && hasEdits) {
        const updateData: any = {};
        if (form.name) updateData.full_name = form.name;
        if (form.sector) updateData.sector = form.sector;
        if (form.creative_domains.length > 0) updateData.creative_domains = form.creative_domains;
        if (form.purpose_of_visit.length > 0) updateData.purpose_of_visit = form.purpose_of_visit;
        if (form.organization) updateData.organization = form.organization;
        if (form.designation) updateData.designation = form.designation;
        if (form.email) updateData.email = form.email;
        if (form.gender) updateData.gender = form.gender;

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

      const frame = () => {
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
        });
        setFoundUser(null);
        setStep('privacy');
      }, duration + 500);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <>
      <Helmet>
        <title>Check-In - Digital Creatives Hub Iligan</title>
        <meta name="description" content="Walk-in check-in kiosk for Digital Creatives Hub Iligan. Register your visit and check into available events." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 flex items-center justify-center p-4">
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
              {step === 'identify' && 'Is this you?'}
              {step === 'purpose' && 'What brings you here?'}
              {step === 'newUser' && 'Welcome!'}
              {step === 'success' && 'Welcome to the Hub!'}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {step === 'privacy' && 'Please read before proceeding'}
              {step === 'mobile' && 'Use the keypad below or type on keyboard'}
              {step === 'identify' && 'We found a previous visitor with this number'}
              {step === 'purpose' && 'Select all that apply'}
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

          {/* ═══ STEP: IDENTIFY (Colorful "Is this you?" check) ═══ */}
          {step === 'identify' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 border-2 border-violet-400/30 rounded-3xl p-6 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/20 to-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4 shadow-lg shadow-emerald-500/30">
                    <UserCheck className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-violet-200 mb-3">We found this visitor:</p>
                  
                  {/* User info card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-5 border border-white/20">
                    <p className="text-3xl font-bold text-white mb-2">{form.name || foundUser?.full_name}</p>
                    <p className="text-lg text-violet-200 mb-3">{form.mobile}</p>
                    
                    {/* Additional details */}
                    {(foundUser?.sector || foundUser?.organization) && (
                      <div className="space-y-1 text-left text-sm">
                        {foundUser?.sector && (
                          <div className="flex items-center gap-2 text-white/70">
                            <Building2 className="h-4 w-4" />
                            <span>{foundUser.sector}</span>
                          </div>
                        )}
                        {foundUser?.organization && (
                          <div className="flex items-center gap-2 text-white/70">
                            <Building className="h-4 w-4" />
                            <span>{foundUser.organization}</span>
                          </div>
                        )}
                        {foundUser?.designation && (
                          <div className="flex items-center gap-2 text-white/70">
                            <BadgeCheck className="h-4 w-4" />
                            <span>{foundUser.designation}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleYesThisIsMe}
                      className="flex-1 max-w-[180px] px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-95"
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
              {/* Event Selection (if events are happening today) */}
              {todayEvents.length > 0 && (
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-400/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PartyPopper className="h-5 w-5 text-amber-400" />
                    <p className="text-sm font-semibold text-amber-200">Events happening today</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(null)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedEventId === null
                          ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200'
                          : 'bg-white/5 border border-white/20 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedEventId === null ? 'bg-amber-500' : 'bg-white/10'
                        }`}>
                          {selectedEventId === null && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">Just visiting / General purpose</p>
                        </div>
                      </div>
                    </button>
                    {todayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEventId(event.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                          selectedEventId === event.id
                            ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200'
                            : 'bg-white/5 border border-white/20 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            selectedEventId === event.id ? 'bg-amber-500' : 'bg-white/10'
                          }`}>
                            {selectedEventId === event.id && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-white/50">
                              {event.start_time} - {event.end_time}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PURPOSE_OF_VISIT_OPTIONS.map((purpose, index) => {
                  const isSelected = form.purpose_of_visit.includes(purpose);
                  const colors = [
                    'from-pink-500 to-rose-500',
                    'from-purple-500 to-indigo-500',
                    'from-blue-500 to-cyan-500',
                    'from-teal-500 to-emerald-500',
                    'from-green-500 to-lime-500',
                    'from-yellow-500 to-amber-500',
                    'from-orange-500 to-red-500',
                    'from-red-500 to-pink-500',
                    'from-indigo-500 to-purple-500',
                    'from-violet-500 to-fuchsia-500',
                  ];
                  const colorClass = colors[index % colors.length];
                  
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
                        relative px-4 py-4 rounded-2xl text-left transition-all duration-200
                        ${isSelected
                          ? `bg-gradient-to-r ${colorClass} text-white shadow-lg scale-[1.02]`
                          : 'bg-white/10 border-2 border-white/20 text-white/70 hover:bg-white/20 hover:border-white/30'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-white/20' : 'bg-white/10'
                        }`}>
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <span className="font-semibold text-sm">{purpose}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {form.purpose_of_visit.length === 0 && (
                <p className="text-center text-sm text-red-400 mt-2">Please select at least one purpose</p>
              )}
              
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={form.purpose_of_visit.length === 0 || submitting}
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

              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Sector *</label>
                <div className="relative">
                  <select
                    value={form.sector}
                    onChange={e => update({ sector: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white text-sm appearance-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Select your sector</option>
                    {SECTOR_OPTIONS.map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Creative Domains *</label>
                <p className="text-xs text-white/40 mb-2">Select all that apply (PCIDA RA 11904)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PCIDA_DOMAINS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => {
                        const isSelected = form.creative_domains.includes(domain);
                        update({
                          creative_domains: isSelected
                            ? form.creative_domains.filter(d => d !== domain)
                            : [...form.creative_domains, domain]
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${
                        form.creative_domains.includes(domain)
                          ? 'bg-violet-500/20 border border-violet-400/50 text-violet-200'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded flex items-center justify-center flex-shrink-0 ${
                        form.creative_domains.includes(domain) ? 'bg-violet-500' : 'bg-white/10'
                      }`}>
                        {form.creative_domains.includes(domain) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {domain}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">Purpose of Visit *</label>
                <p className="text-xs text-white/40 mb-2">Select all that apply</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PURPOSE_OF_VISIT_OPTIONS.map((purpose, index) => {
                    const isSelected = form.purpose_of_visit.includes(purpose);
                    const colors = [
                      'from-pink-500 to-rose-500',
                      'from-purple-500 to-indigo-500',
                      'from-blue-500 to-cyan-500',
                      'from-teal-500 to-emerald-500',
                      'from-green-500 to-lime-500',
                      'from-yellow-500 to-amber-500',
                      'from-orange-500 to-red-500',
                      'from-red-500 to-pink-500',
                      'from-indigo-500 to-purple-500',
                      'from-violet-500 to-fuchsia-500',
                    ];
                    const colorClass = colors[index % colors.length];
                    
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
                          relative px-4 py-3 rounded-2xl text-left transition-all duration-200
                          ${isSelected
                            ? `bg-gradient-to-r ${colorClass} text-white shadow-lg scale-[1.02]`
                            : 'bg-white/10 border-2 border-white/20 text-white/70 hover:bg-white/20 hover:border-white/30'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-white/20' : 'bg-white/10'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="font-semibold text-xs">{purpose}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {form.purpose_of_visit.length === 0 && (
                  <p className="text-xs text-red-400 mt-2">Please select at least one purpose</p>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!form.name.trim() || !form.sector.trim() || form.creative_domains.length === 0 || form.purpose_of_visit.length === 0 || submitting}
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
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mb-6 animate-pulse">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {foundUser ? 'Welcome back!' : 'Welcome to the Hub!'}
              </h2>
              <p className="text-4xl mb-4">
                {foundUser ? '👋' : '🎉'}
              </p>
              <p className="text-white/70 text-sm">
                {foundUser 
                  ? 'Great to see you again! You\'re all checked in.' 
                  : 'You\'re all checked in! Enjoy your first visit.'}
              </p>
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
    </>
  );
}
