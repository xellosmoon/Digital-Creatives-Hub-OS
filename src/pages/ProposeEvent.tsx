import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Sparkles, Calendar, Clock, User, Mail, Phone, FileText,
  Users, Image, Link as LinkIcon, Building2, CheckCircle,
  ArrowLeft, Send, PartyPopper, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type Step = 'details' | 'logistics' | 'review';
const STEP_META: { key: Step; label: string }[] = [
  { key: 'details', label: 'Event Info' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'review', label: 'Review' },
];

export default function ProposeEvent() {
  const [step, setStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    posterUrl: '',
    registrationLink: '',
    organizer: '',
    contactEmail: '',
    contactPhone: '',
    proposerName: '',
    proposerEmail: '',
    proposerPhone: '',
    startDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    startTime: '14:00',
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    endTime: '17:00',
    expectedAttendees: '',
    notes: '',
  });

  const stepIdx = STEP_META.findIndex(s => s.key === step);
  const update = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const canProceed = (): boolean => {
    switch (step) {
      case 'details':
        return !!form.title.trim() && !!form.proposerName.trim() && !!form.proposerEmail.trim();
      case 'logistics':
        return !!form.startDate && !!form.startTime && !!form.endDate && !!form.endTime;
      default:
        return true;
    }
  };

  const next = () => { if (stepIdx < STEP_META.length - 1) setStep(STEP_META[stepIdx + 1].key); };
  const prev = () => { if (stepIdx > 0) setStep(STEP_META[stepIdx - 1].key); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const startISO = new Date(`${form.startDate}T${form.startTime}:00`).toISOString();
      const endISO = new Date(`${form.endDate}T${form.endTime}:00`).toISOString();

      const { error } = await supabase.from('events').insert({
        title: form.title,
        description: form.description || null,
        poster_url: form.posterUrl || null,
        registration_link: form.registrationLink || null,
        organizer: form.organizer || form.proposerName,
        contact_email: form.contactEmail || form.proposerEmail,
        contact_phone: form.contactPhone || form.proposerPhone || null,
        start_time: startISO,
        end_time: endISO,
        status: 'proposed',
        proposer_name: form.proposerName,
        proposer_email: form.proposerEmail,
        proposer_phone: form.proposerPhone || null,
        proposal_notes: form.notes || null,
        expected_attendees: form.expectedAttendees ? parseInt(form.expectedAttendees) : null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Event proposal submitted!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit proposal');
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
            Our team will review your event proposal and get back to you at <span className="font-semibold">{form.proposerEmail}</span>.
            This usually takes 1–2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg transition-all duration-300"
            >
              Back to Home
            </Link>
            <Link
              to="/calendar"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-300"
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-16">
        {/* Step indicator */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-amber-100/50 border border-white/60 px-4 sm:px-6 py-4 mb-8">
          <div className="flex items-center justify-between">
            {STEP_META.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  {i > 0 && (
                    <div className={`hidden sm:block flex-1 h-0.5 mx-2 rounded transition-colors duration-500 ${done ? 'bg-amber-500' : 'bg-gray-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300
                      ${done ? 'bg-amber-500 text-white shadow-md' : active ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-gray-100 text-gray-400'}
                    `}>
                      {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`hidden sm:inline text-sm font-medium transition-colors duration-300 ${active ? 'text-amber-700' : done ? 'text-amber-500' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-100/30 border border-white/60 p-5 sm:p-8 transition-all duration-300">

          {/* ═══ STEP: DETAILS ═══ */}
          {step === 'details' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Event Details</h2>
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
                    className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <FileText className="h-4 w-4 text-amber-500" /> Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => update({ description: e.target.value })}
                    placeholder="What's the event about? What will attendees experience?"
                    className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Building2 className="h-4 w-4 text-amber-500" /> Organizer / Group
                    </label>
                    <input
                      type="text"
                      value={form.organizer}
                      onChange={e => update({ organizer: e.target.value })}
                      placeholder="Your org or group name"
                      className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Users className="h-4 w-4 text-amber-500" /> Expected Attendees
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.expectedAttendees}
                      onChange={e => update({ expectedAttendees: e.target.value })}
                      placeholder="e.g. 20"
                      className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Your Contact Info</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                        <User className="h-3.5 w-3.5 text-amber-500" /> Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.proposerName}
                        onChange={e => update({ proposerName: e.target.value })}
                        placeholder="Juan Dela Cruz"
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                        <Mail className="h-3.5 w-3.5 text-amber-500" /> Your Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.proposerEmail}
                        onChange={e => update({ proposerEmail: e.target.value })}
                        placeholder="juan@example.com"
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                        <Phone className="h-3.5 w-3.5 text-amber-500" /> Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={form.proposerPhone}
                        onChange={e => update({ proposerPhone: e.target.value })}
                        placeholder="+63 917 123 4567"
                        className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP: LOGISTICS ═══ */}
          {step === 'logistics' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Date, Time & Extras</h2>
              <p className="text-sm text-gray-500 mb-6">When should the event happen?</p>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Calendar className="h-4 w-4 text-amber-500" /> Start Date *
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => {
                        update({ startDate: e.target.value });
                        if (e.target.value > form.endDate) update({ startDate: e.target.value, endDate: e.target.value });
                      }}
                      min={format(addDays(new Date(), 3), 'yyyy-MM-dd')}
                      className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Clock className="h-4 w-4 text-amber-500" /> Start Time *
                    </label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={e => update({ startTime: e.target.value })}
                      className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Calendar className="h-4 w-4 text-amber-500" /> End Date *
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => update({ endDate: e.target.value })}
                      min={form.startDate}
                      className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                      <Clock className="h-4 w-4 text-amber-500" /> End Time *
                    </label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={e => update({ endTime: e.target.value })}
                      className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <Image className="h-4 w-4 text-amber-500" /> Event Poster URL (optional)
                  </label>
                  <input
                    type="url"
                    value={form.posterUrl}
                    onChange={e => update({ posterUrl: e.target.value })}
                    placeholder="https://example.com/poster.jpg"
                    className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                  />
                  {form.posterUrl && (
                    <img src={form.posterUrl} alt="Preview" className="mt-2 rounded-xl max-h-40 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <LinkIcon className="h-4 w-4 text-amber-500" /> Registration Link (optional)
                  </label>
                  <input
                    type="url"
                    value={form.registrationLink}
                    onChange={e => update({ registrationLink: e.target.value })}
                    placeholder="Google Form, Eventbrite, Facebook event, etc."
                    className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <FileText className="h-4 w-4 text-amber-500" /> Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => update({ notes: e.target.value })}
                    placeholder="Any special requirements? AV equipment, seating arrangement, catering needs..."
                    className="w-full rounded-xl border-gray-200 bg-gray-50/80 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 placeholder:text-gray-300 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP: REVIEW ═══ */}
          {step === 'review' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Proposal</h2>
              <p className="text-sm text-gray-500 mb-6">Double-check everything before submitting</p>

              <div className="space-y-4">
                {/* Event info */}
                <div className="rounded-2xl bg-gray-50/80 p-4">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{form.title}</h3>
                  {form.description && <p className="text-sm text-gray-600 mb-2">{form.description}</p>}
                  {form.organizer && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building2 className="h-4 w-4" /> {form.organizer}
                    </div>
                  )}
                  {form.expectedAttendees && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Users className="h-4 w-4" /> ~{form.expectedAttendees} attendees
                    </div>
                  )}
                </div>

                {/* Date & Time */}
                <div className="rounded-2xl bg-gray-50/80 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-gray-900">
                      {format(new Date(form.startDate + 'T00:00'), 'EEE, MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-gray-900">
                      {form.startTime} – {form.endTime}
                    </span>
                  </div>
                </div>

                {/* Contact */}
                <div className="rounded-2xl bg-gray-50/80 p-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.proposerName}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.proposerEmail}</span></div>
                  {form.proposerPhone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-500" /><span className="text-gray-900">{form.proposerPhone}</span></div>}
                </div>

                {/* Notes */}
                {form.notes && (
                  <div className="rounded-2xl bg-gray-50/80 p-4 text-sm">
                    <p className="text-gray-500 font-medium mb-1">Notes:</p>
                    <p className="text-gray-700">{form.notes}</p>
                  </div>
                )}

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
