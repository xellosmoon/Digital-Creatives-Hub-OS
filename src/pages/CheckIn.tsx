import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, ArrowLeft, CheckCircle,
  Sparkles, UserCheck, ShieldCheck, Loader2, ChevronDown, Edit2, X, Building, Briefcase, Mail, User, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { PCIDA_DOMAINS, PURPOSE_OF_VISIT_OPTIONS } from '../types/hub';

type Step = 'privacy' | 'mobile' | 'confirm' | 'newUser' | 'success';

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

  const [editingSector, setEditingSector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingCreativeDomains, setEditingCreativeDomains] = useState(false);
  const [editingPurposeOfVisit, setEditingPurposeOfVisit] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);

  const update = useCallback((patch: Partial<typeof form>): void => {
    setForm(prev => ({ ...prev, ...patch }));
    setHasEdits(true);
  }, []);

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
          sector: user.sector || '',
          creative_domains: user.creative_domains || (user.creative_domain ? [user.creative_domain] : []),
          purpose_of_visit: user.purpose_of_visit || [],
          organization: user.organization || '',
          designation: user.designation || '',
          email: user.email || '',
          gender: user.gender || '',
        }));
        setStep('confirm');
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
    } else if (step === 'confirm') {
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

  const handleNotMe = (): void => {
    // Keep the phone number, just let them enter their own name
    setFoundUser(null);
    setStep('newUser');
  };

  // ── Submit Check-In ────────────────────────────────────────────
  const handleCheckIn = async (): Promise<void> => {
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
        purpose_of_visit: form.purpose_of_visit.length > 0 ? form.purpose_of_visit : (foundUser?.purpose_of_visit || null),
        organization: form.organization || foundUser?.organization || null,
        designation: form.designation || foundUser?.designation || null,
        email: form.email || foundUser?.email || null,
        gender: form.gender || foundUser?.gender || null,
        status: 'pending_entrance',
        privacy_consented: true,
        consent_timestamp: new Date().toISOString(),
        is_walk_in: !foundUser,
      });

      if (error) throw error;
      setStep('success');
      setSubmitting(false);
      setHasEdits(false);
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
                
                {/* Name with inline edit */}
                <div className="mb-4">
                  {editingName ? (
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="text"
                        value={form.name || foundUser?.full_name || ''}
                        onChange={e => update({ name: e.target.value })}
                        onBlur={() => setEditingName(false)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') setEditingName(false);
                          if (e.key === 'Escape') {
                            setEditingName(false);
                            setForm(prev => ({ ...prev, name: '' }));
                          }
                        }}
                        autoFocus
                        className="w-full max-w-xs bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-lg font-bold focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setForm(prev => ({ ...prev, name: '' }));
                        }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <p className="text-2xl font-bold text-white">{form.name || foundUser?.full_name}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(true);
                          setForm(prev => ({ ...prev, name: foundUser?.full_name || '' }));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                        title="Edit name"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-white/50 mb-4">{form.mobile}</p>

                {/* Additional fields grid */}
                <div className="space-y-3 text-left">
                  {/* Sector */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 w-24">Sector:</span>
                    {editingSector ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={form.sector || foundUser?.sector || ''}
                          onChange={e => update({ sector: e.target.value })}
                          onBlur={() => setEditingSector(false)}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs appearance-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
                        >
                          <option value="" className="bg-slate-900">Select sector</option>
                          {SECTOR_OPTIONS.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSector(false);
                            setForm(prev => ({ ...prev, sector: '' }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        {foundUser?.sector || form.sector ? (
                          <>
                            <span className="text-sm text-white/80">{form.sector || foundUser?.sector}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSector(true);
                                setForm(prev => ({ ...prev, sector: foundUser?.sector || '' }));
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingSector(true)}
                            className="text-xs text-violet-300 underline hover:text-violet-200"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Creative Domains */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Creative Domains:</span>
                      <button
                        type="button"
                        onClick={() => setEditingCreativeDomains(!editingCreativeDomains)}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                      >
                        {editingCreativeDomains ? <X className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                      </button>
                    </div>
                    {editingCreativeDomains ? (
                      <div className="grid grid-cols-1 gap-1.5">
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
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all ${
                              form.creative_domains.includes(domain)
                                ? 'bg-violet-500/20 border border-violet-400/50 text-violet-200'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            <div className={`h-3.5 w-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                              form.creative_domains.includes(domain) ? 'bg-violet-500' : 'bg-white/10'
                            }`}>
                              {form.creative_domains.includes(domain) && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            {domain}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(form.creative_domains.length > 0 ? form.creative_domains : foundUser?.creative_domains)?.map((domain) => (
                          <span key={domain} className="text-xs text-white/80 bg-white/10 px-2 py-0.5 rounded">
                            {domain}
                          </span>
                        ))}
                        {(!form.creative_domains.length && !foundUser?.creative_domains?.length) && (
                          <span className="text-xs text-white/30 italic">None selected</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Purpose of Visit */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Purpose of Visit:</span>
                      <button
                        type="button"
                        onClick={() => setEditingPurposeOfVisit(!editingPurposeOfVisit)}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                      >
                        {editingPurposeOfVisit ? <X className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                      </button>
                    </div>
                    {editingPurposeOfVisit ? (
                      <div className="grid grid-cols-1 gap-1.5">
                        {PURPOSE_OF_VISIT_OPTIONS.map((purpose) => (
                          <button
                            key={purpose}
                            type="button"
                            onClick={() => {
                              const isSelected = form.purpose_of_visit.includes(purpose);
                              update({
                                purpose_of_visit: isSelected
                                  ? form.purpose_of_visit.filter(p => p !== purpose)
                                  : [...form.purpose_of_visit, purpose]
                              });
                            }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all ${
                              form.purpose_of_visit.includes(purpose)
                                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            <div className={`h-3.5 w-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                              form.purpose_of_visit.includes(purpose) ? 'bg-emerald-500' : 'bg-white/10'
                            }`}>
                              {form.purpose_of_visit.includes(purpose) && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            {purpose}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(form.purpose_of_visit.length > 0 ? form.purpose_of_visit : foundUser?.purpose_of_visit)?.map((purpose) => (
                          <span key={purpose} className="text-xs text-white/80 bg-white/10 px-2 py-0.5 rounded">
                            {purpose}
                          </span>
                        ))}
                        {(!form.purpose_of_visit.length && !foundUser?.purpose_of_visit?.length) && (
                          <span className="text-xs text-white/30 italic">None selected</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Organization */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 w-24">Organization:</span>
                    {editingOrganization ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={form.organization || foundUser?.organization || ''}
                          onChange={e => update({ organization: e.target.value })}
                          onBlur={() => setEditingOrganization(false)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') setEditingOrganization(false);
                            if (e.key === 'Escape') {
                              setEditingOrganization(false);
                              setForm(prev => ({ ...prev, organization: '' }));
                            }
                          }}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Organization"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrganization(false);
                            setForm(prev => ({ ...prev, organization: '' }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        {foundUser?.organization || form.organization ? (
                          <>
                            <span className="text-sm text-white/80">{form.organization || foundUser?.organization}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrganization(true);
                                setForm(prev => ({ ...prev, organization: foundUser?.organization || '' }));
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingOrganization(true)}
                            className="text-xs text-violet-300 underline hover:text-violet-200"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Designation */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 w-24">Designation:</span>
                    {editingDesignation ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={form.designation || foundUser?.designation || ''}
                          onChange={e => update({ designation: e.target.value })}
                          onBlur={() => setEditingDesignation(false)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') setEditingDesignation(false);
                            if (e.key === 'Escape') {
                              setEditingDesignation(false);
                              setForm(prev => ({ ...prev, designation: '' }));
                            }
                          }}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Designation"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDesignation(false);
                            setForm(prev => ({ ...prev, designation: '' }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        {foundUser?.designation || form.designation ? (
                          <>
                            <span className="text-sm text-white/80">{form.designation || foundUser?.designation}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDesignation(true);
                                setForm(prev => ({ ...prev, designation: foundUser?.designation || '' }));
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingDesignation(true)}
                            className="text-xs text-violet-300 underline hover:text-violet-200"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 w-24">Email:</span>
                    {editingEmail ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="email"
                          value={form.email || foundUser?.email || ''}
                          onChange={e => update({ email: e.target.value })}
                          onBlur={() => setEditingEmail(false)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') setEditingEmail(false);
                            if (e.key === 'Escape') {
                              setEditingEmail(false);
                              setForm(prev => ({ ...prev, email: '' }));
                            }
                          }}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Email"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEmail(false);
                            setForm(prev => ({ ...prev, email: '' }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        {foundUser?.email || form.email ? (
                          <>
                            <span className="text-sm text-white/80">{form.email || foundUser?.email}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmail(true);
                                setForm(prev => ({ ...prev, email: foundUser?.email || '' }));
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingEmail(true)}
                            className="text-xs text-violet-300 underline hover:text-violet-200"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 w-24">Gender:</span>
                    {editingGender ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={form.gender || foundUser?.gender || ''}
                          onChange={e => update({ gender: e.target.value })}
                          onBlur={() => setEditingGender(false)}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs appearance-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
                        >
                          <option value="" className="bg-slate-900">Select gender</option>
                          {GENDER_OPTIONS.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGender(false);
                            setForm(prev => ({ ...prev, gender: '' }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        {foundUser?.gender || form.gender ? (
                          <>
                            <span className="text-sm text-white/80">{form.gender || foundUser?.gender}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGender(true);
                                setForm(prev => ({ ...prev, gender: foundUser?.gender || '' }));
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingGender(true)}
                            className="text-xs text-violet-300 underline hover:text-violet-200"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PURPOSE_OF_VISIT_OPTIONS.map((purpose) => (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => {
                        const isSelected = form.purpose_of_visit.includes(purpose);
                        update({
                          purpose_of_visit: isSelected
                            ? form.purpose_of_visit.filter(p => p !== purpose)
                            : [...form.purpose_of_visit, purpose]
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${
                        form.purpose_of_visit.includes(purpose)
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded flex items-center justify-center flex-shrink-0 ${
                        form.purpose_of_visit.includes(purpose) ? 'bg-emerald-500' : 'bg-white/10'
                      }`}>
                        {form.purpose_of_visit.includes(purpose) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {purpose}
                    </button>
                  ))}
                </div>
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
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Hub!</h2>
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-white/70 text-sm">You're all checked in!</p>
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
