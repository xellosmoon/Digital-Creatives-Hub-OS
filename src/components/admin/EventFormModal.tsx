import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Calendar, Clock, Image, Link2, User, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../../types';

// ── Props ───────────────────────────────────────────────────────────
interface EventFormModalProps {
  /** Pass an existing event to edit, or `null` to create a new one. */
  event: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

interface SpaceOption {
  id: string;
  name: string;
}

/**
 * Admin-only modal for creating or editing an event.
 * All fields map directly to the `events` table columns.
 */
export default function EventFormModal({ event, onClose, onSaved }: EventFormModalProps) {
  const isEditing = !!event;
  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [posterPreviewError, setPosterPreviewError] = useState(false);

  // ── Form state ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    poster_url: event?.poster_url ?? '',
    registration_link: event?.registration_link ?? '',
    organizer: event?.organizer ?? '',
    contact_email: event?.contact_email ?? '',
    contact_phone: event?.contact_phone ?? '',
    space_id: event?.space_id ?? '',
    start_date: event ? format(new Date(event.start_time), 'yyyy-MM-dd') : '',
    start_time: event ? format(new Date(event.start_time), 'HH:mm') : '',
    end_date: event ? format(new Date(event.end_time), 'yyyy-MM-dd') : '',
    end_time: event ? format(new Date(event.end_time), 'HH:mm') : '',
    is_featured: event?.is_featured ?? false,
    status: event?.status ?? 'published' as 'draft' | 'published' | 'cancelled',
  });

  // ── Fetch available spaces for the dropdown ─────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setSpaces(data ?? []);
    })();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────
  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'poster_url') setPosterPreviewError(false);
  };

  /** Combine date + time strings into an ISO timestamp. */
  const toISO = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!form.title.trim()) { toast.error('Event title is required'); return; }
    if (!form.start_date || !form.start_time) { toast.error('Start date & time are required'); return; }
    if (!form.end_date || !form.end_time) { toast.error('End date & time are required'); return; }

    const startISO = toISO(form.start_date, form.start_time);
    const endISO = toISO(form.end_date, form.end_time);

    if (new Date(endISO) <= new Date(startISO)) {
      toast.error('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      // Get current user id for created_by
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        poster_url: form.poster_url.trim() || null,
        registration_link: form.registration_link.trim() || null,
        organizer: form.organizer.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        space_id: form.space_id || null,
        start_time: startISO,
        end_time: endISO,
        is_featured: form.is_featured,
        status: form.status,
        ...(isEditing ? {} : { created_by: user?.id ?? null }),
      };

      if (isEditing && event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', event.id);
        if (error) throw error;
        toast.success('Event updated');
      } else {
        // Insert new event
        const { error } = await supabase
          .from('events')
          .insert(payload);
        if (error) throw error;
        toast.success('Event created');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving event:', err);
      toast.error(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  // ── JSX ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ── Title ─────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Vibe Coding Workshop"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            />
          </div>

          {/* ── Date / Time row ───────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => {
                  updateField('start_date', e.target.value);
                  // Auto-fill end date if empty
                  if (!form.end_date) updateField('end_date', e.target.value);
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline w-4 h-4 mr-1" />
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline w-4 h-4 mr-1" />
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {/* ── Space selector ────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue / Space
            </label>
            <select
              value={form.space_id}
              onChange={(e) => updateField('space_id', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">— No specific space —</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* ── Organizer + contact row ───────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                Organizer
              </label>
              <input
                type="text"
                value={form.organizer}
                onChange={(e) => updateField('organizer', e.target.value)}
                placeholder="Digital Creatives Hub"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline w-4 h-4 mr-1" />
                Contact Email
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                placeholder="hello@example.com"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline w-4 h-4 mr-1" />
                Contact Phone
              </label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                placeholder="+63 XXX XXX XXXX"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* ── Description ───────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              placeholder="Describe the event, what attendees will experience..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* ── Poster URL + preview ──────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Image className="inline w-4 h-4 mr-1" />
              Event Poster URL
            </label>
            <input
              type="url"
              value={form.poster_url}
              onChange={(e) => updateField('poster_url', e.target.value)}
              placeholder="https://example.com/poster.jpg"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {/* Live poster preview */}
            {form.poster_url && !posterPreviewError && (
              <img
                src={form.poster_url}
                alt="Poster preview"
                onError={() => setPosterPreviewError(true)}
                className="mt-2 w-full max-h-48 object-cover rounded-md border border-gray-200"
              />
            )}
          </div>

          {/* ── Registration link ─────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Link2 className="inline w-4 h-4 mr-1" />
              Registration Link
            </label>
            <input
              type="url"
              value={form.registration_link}
              onChange={(e) => updateField('registration_link', e.target.value)}
              placeholder="Google Form, Eventbrite, or Facebook event link"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* ── Toggles row ───────────────────────────────────── */}
          <div className="flex flex-wrap gap-6">
            {/* Featured toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => updateField('is_featured', e.target.checked)}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Feature this event</span>
            </label>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as typeof form.status)}
                className="rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
