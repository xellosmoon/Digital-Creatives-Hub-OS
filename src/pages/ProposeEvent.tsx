import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Sparkles, Calendar, Clock, User, Mail, Phone, FileText,
  Users, Image, Link as LinkIcon, Building2, CheckCircle,
  ArrowLeft, Send, PartyPopper, Info, Check, Music, Film,
  Palette, Monitor, PenTool, BookOpen, Megaphone, Landmark,
  Theater, X, Grid3X3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { PCIDA_DOMAINS } from '../types/hub';

type Step = 'organizer' | 'logistics' | 'domains' | 'review';
const STEP_META: { key: Step; label: string }[] = [
  { key: 'organizer', label: 'Organizer' },
  { key: 'logistics', label: 'Event Details' },
  { key: 'domains', label: 'Creative Domains' },
  { key: 'review', label: 'Review' },
];

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  'Audio & Music': Music,
  'Film & Animation': Film,
  'Visual Arts': Palette,
  'Digital Interactive Media': Monitor,
  'Design': PenTool,
  'Publishing': BookOpen,
  'Advertising': Megaphone,
  'Cultural & Heritage': Landmark,
  'Performing Arts': Theater,
  'Other': Sparkles,
};

export default function ProposeEvent(): JSX.Element {
  const [step, setStep] = useState<Step>('organizer');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const [form, setForm] = useState({
    // Section A: Organizer Details
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    role: '',
    // Section B: Event Logistics
    title: '',
    description: '',
    expectedGuests: '',
    // Event Dates/Times
    eventDates: [{ date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), startTime: '14:00', endTime: '17:00' }],
  });

  const stepIdx = STEP_META.findIndex(s => s.key === step);
  const update = (patch: Partial<typeof form>): void => setForm(prev => ({ ...prev, ...patch }));

  const toggleDomain = (domain: string): void => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const addEventDate = (): void => {
    update({
      eventDates: [
        ...form.eventDates,
        { date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), startTime: '14:00', endTime: '17:00' }
      ]
    });
  };

  const removeEventDate = (index: number): void => {
    update({
      eventDates: form.eventDates.filter((_, i) => i !== index)
    });
  };

  const updateEventDate = (index: number, field: 'date' | 'startTime' | 'endTime', value: string): void => {
    const updatedDates = [...form.eventDates];
    updatedDates[index] = { ...updatedDates[index], [field]: value };
    update({ eventDates: updatedDates });
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'organizer':
        return !!form.fullName.trim() && !!form.email.trim() && !!form.phone.trim();
      case 'logistics':
        const guestCount = parseInt(form.expectedGuests);
        return !!form.title.trim() && !!form.description.trim() && !!form.expectedGuests.trim() && !isNaN(guestCount) && guestCount > 0;
      case 'domains':
        return selectedDomains.length > 0;
      default:
        return true;
    }
  };

  const next = (): void => { if (stepIdx < STEP_META.length - 1) setStep(STEP_META[stepIdx + 1].key); };
  const prev = (): void => { if (stepIdx > 0) setStep(STEP_META[stepIdx - 1].key); };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      console.log('Submitting proposal:', {
        organizer_name: form.fullName,
        organizer_email: form.email,
        organizer_phone: form.phone,
        organization: form.organization || null,
        role: form.role || null,
        title: form.title,
        description: form.description,
        expected_guests: parseInt(form.expectedGuests) || null,
        event_dates: form.eventDates,
        creative_domains: selectedDomains,
        status: 'pending_review',
      });

      const { data, error } = await supabase.from('hub_events').insert({
        // Organizer details
        organizer_name: form.fullName,
        organizer_email: form.email,
        organizer_phone: form.phone,
        organization: form.organization || null,
        role: form.role || null,
        // Event details
        title: form.title,
        description: form.description,
        expected_guests: parseInt(form.expectedGuests) || null,
        // Event dates/times - convert to proper format
        event_dates: form.eventDates.map(eventDate => ({
          date: eventDate.date,
          start_time: eventDate.startTime,
          end_time: eventDate.endTime,
        })),
        // PCIDA domains
        creative_domains: selectedDomains,
        // Status
        status: 'pending_review',
      }).select();

      console.log('Insert result:', { data, error });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Event proposal submitted!');
    } catch (err: unknown) {
      console.error('Error submitting proposal:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit proposal';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-8 sm:p-12 max-w-lg text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Our team will review your event proposal and get back to you at <span className="font-semibold">{form.email}</span>.
            This usually takes 1–2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-stone-50 relative overflow-hidden">
      {/* Dynamic Brand Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0C2340] blur-3xl opacity-20 rounded-full" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-amber-500 blur-3xl opacity-20 rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-orange-500 blur-3xl opacity-10 rounded-full" />
      </div>

      {/* Hero */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl shadow-lg shadow-orange-500/30 text-white px-6 sm:px-8 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-2">
            <PartyPopper className="h-6 w-6 opacity-80" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Propose an Event</h1>
          </div>
          <p className="text-amber-100 text-sm sm:text-base max-w-lg">
            Want to host a workshop, meetup, or screening at the Digital Creatives Hub?
            Tell us about it and we'll make it happen.
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-16">
        {/* Step indicator */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 px-4 sm:px-6 py-4 mb-8">
          <div className="flex items-center justify-between">
            {STEP_META.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              const stepIcons = [User, Calendar, Grid3X3, CheckCircle];
              const StepIcon = stepIcons[i];
              return (
                <div key={s.key} className="flex items-center flex-1">
                  {i > 0 && (
                    <div className={`hidden sm:block flex-1 h-0.5 mx-2 rounded transition-colors duration-500 ${done ? 'bg-amber-500' : 'bg-gray-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300
                      ${done ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : active ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/50' : 'bg-white/50 text-slate-400'}
                    `}>
                      {done ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </span>
                    <span className={`hidden sm:inline text-sm font-medium transition-colors duration-300 ${active ? 'text-amber-700' : done ? 'text-amber-500' : 'text-slate-400'}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content card */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl border border-white/40 p-5 sm:p-8 transition-all duration-300">

          {/* ═══ STEP: ORGANIZER ═══ */}
          {step === 'organizer' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Organizer Details</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about yourself or your organization</p>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <User className="h-4 w-4 text-amber-500" /> Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={e => update({ fullName: e.target.value })}
                    placeholder="Juan Dela Cruz"
                    className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Mail className="h-4 w-4 text-amber-500" /> Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => update({ email: e.target.value })}
                      placeholder="juan@example.com"
                      className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Phone className="h-4 w-4 text-amber-500" /> Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={e => update({ phone: e.target.value })}
                      placeholder="+63 917 123 4567"
                      className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <Building2 className="h-4 w-4 text-amber-500" /> School / Business / Organization
                  </label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={e => update({ organization: e.target.value })}
                    placeholder="Your organization name"
                    className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <User className="h-4 w-4 text-amber-500" /> Designation / Role
                  </label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={e => update({ role: e.target.value })}
                    placeholder="e.g. Student, Teacher, Manager"
                    className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP: LOGISTICS ═══ */}
          {step === 'logistics' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Event Logistics</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about the event you'd like to host</p>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => update({ title: e.target.value })}
                    placeholder="e.g. Vibe Coding Workshop, Film Screening Night"
                    className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <FileText className="h-4 w-4 text-amber-500" /> Comprehensive Explanation / Description *
                  </label>
                  <textarea
                    rows={6}
                    value={form.description}
                    onChange={e => update({ description: e.target.value })}
                    placeholder="What's the event about? What will attendees experience? What are the goals?"
                    className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400 resize-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <Users className="h-4 w-4 text-amber-500" /> Expected Number of Guests / Attendees *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.expectedGuests}
                    onChange={e => update({ expectedGuests: e.target.value })}
                    placeholder="e.g. 20"
                    className="w-full rounded-xl border-gray-200 bg-stone-100/50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 placeholder:text-slate-400"
                  />
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Calendar className="h-4 w-4 text-amber-500" /> Event Dates & Times *
                    </label>
                    <button
                      type="button"
                      onClick={addEventDate}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
                    >
                      + Add Date
                    </button>
                  </div>

                  {form.eventDates.map((eventDate, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3 relative">
                      {form.eventDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEventDate(index)}
                          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Date *</label>
                          <input
                            type="date"
                            value={eventDate.date}
                            onChange={e => updateEventDate(index, 'date', e.target.value)}
                            min={format(addDays(new Date(), 3), 'yyyy-MM-dd')}
                            className="w-full rounded-lg border-gray-200 bg-stone-100/50 focus:bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Start Time *</label>
                          <input
                            type="time"
                            value={eventDate.startTime}
                            onChange={e => updateEventDate(index, 'startTime', e.target.value)}
                            className="w-full rounded-lg border-gray-200 bg-stone-100/50 focus:bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">End Time *</label>
                          <input
                            type="time"
                            value={eventDate.endTime}
                            onChange={e => updateEventDate(index, 'endTime', e.target.value)}
                            className="w-full rounded-lg border-gray-200 bg-stone-100/50 focus:bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP: DOMAINS ═══ */}
          {step === 'domains' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">PCIDA Domain Alignment</h2>
              <p className="text-sm text-gray-500 mb-6">Which creative domains does this event support? (Select all that apply)</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PCIDA_DOMAINS.map((domain) => {
                  const Icon = DOMAIN_ICONS[domain];
                  const isSelected = selectedDomains.includes(domain);
                  return (
                    <label
                      key={domain}
                      className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-md shadow-amber-100/50'
                          : 'border-gray-200 bg-gray-50/50 hover:border-amber-300 hover:bg-amber-50/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => toggleDomain(domain)}
                      />
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white group-hover:border-amber-400'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {Icon && <Icon className="h-4 w-4 text-amber-500" />}
                            <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                              {domain}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-xs text-amber-700">
                <p className="font-medium mb-1">Selected: {selectedDomains.length} domain{selectedDomains.length !== 1 ? 's' : ''}</p>
                <p className="text-amber-600">Select at least one creative domain that best describes your event.</p>
              </div>
            </div>
          )}

          {/* ═══ STEP: REVIEW ═══ */}
          {step === 'review' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Proposal</h2>
              <p className="text-sm text-gray-500 mb-6">Double-check everything before submitting</p>

              <div className="space-y-4">
                {/* Organizer info */}
                <div className="rounded-2xl bg-gray-50/80 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">Organizer Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.fullName}</span></div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.email}</span></div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.phone}</span></div>
                    {form.organization && <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.organization}</span></div>}
                    {form.role && <div className="flex items-center gap-2"><User className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.role}</span></div>}
                  </div>
                </div>

                {/* Event info */}
                <div className="rounded-2xl bg-gray-50/80 p-4">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{form.title}</h3>
                  {form.description && <p className="text-sm text-gray-600 mb-2">{form.description}</p>}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" /> ~{form.expectedGuests} attendees
                  </div>
                  {/* Event Dates */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Event Dates:</p>
                    {form.eventDates.map((eventDate, index) => (
                      <div key={index} className="text-xs text-gray-700 mb-1">
                        {format(new Date(eventDate.date + 'T00:00'), 'EEE, MMM d, yyyy')} • {eventDate.startTime} - {eventDate.endTime}
                      </div>
                    ))}
                  </div>
                </div>

                {/* PCIDA Domains */}
                <div className="rounded-2xl bg-gray-50/80 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">Creative Domains</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDomains.map((domain) => {
                      const Icon = DOMAIN_ICONS[domain];
                      return (
                        <span key={domain} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                          {Icon && <Icon className="h-3 w-3" />}
                          {domain}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Info box */}
                <div className="rounded-2xl bg-amber-50/80 border border-amber-100 p-4 flex items-start gap-3 text-xs text-amber-700">
                  <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p>
                    Your proposal will be reviewed by our team within <span className="font-semibold">1–2 business days</span>.
                    We'll reach out via email to confirm or discuss details.
                    There's no charge for submitting a proposal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
            )}

            {step === 'review' ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {submitting ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
              >
                Continue <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
