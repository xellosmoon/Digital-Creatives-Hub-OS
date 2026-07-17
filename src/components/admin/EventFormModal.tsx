import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { X, Calendar, Clock, Image, Link2, User, Mail, Phone, Sparkles, Upload, Loader2 } from 'lucide-react';
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

interface EventDate {
  date: string;
  start_time: string;
  end_time: string;
}

interface ApprovedProposal {
  id: string;
  title: string;
  description: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  event_dates: any;
  expected_guests: number | null;
}

/**
 * Admin-only modal for creating or editing an event.
 * All fields map directly to the `events` table columns.
 */
export default function EventFormModal({ event, onClose, onSaved }: EventFormModalProps): JSX.Element {
  const isEditing = !!event;
  const [loading, setLoading] = useState(false);
  const [posterPreviewError, setPosterPreviewError] = useState(false);
  const [approvedProposals, setApprovedProposals] = useState<ApprovedProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<string>('');
  const [posterSource, setPosterSource] = useState<'upload' | 'url'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  // ── Form state ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    poster_url: event?.poster_url ?? '',
    registration_link: event?.registration_link ?? '',
    facebook_post_url: (event as any)?.facebook_post_url ?? '',
    organizer: event?.organizer ?? '',
    contact_email: event?.contact_email ?? '',
    contact_phone: event?.contact_phone ?? '',
    eventDates: (() => {
      if (event && (event as any).event_dates && Array.isArray((event as any).event_dates) && (event as any).event_dates.length > 0) {
        // Load from existing event_dates array
        return (event as any).event_dates.map((d: any) => ({
          date: d.date || format(new Date(event.start_time), 'yyyy-MM-dd'),
          start_time: d.start_time || format(new Date(event.start_time), 'HH:mm'),
          end_time: d.end_time || format(new Date(event.end_time), 'HH:mm')
        }));
      } else if (event) {
        // Derive from start_time/end_time as fallback
        return [{
          date: format(new Date(event.start_time), 'yyyy-MM-dd'),
          start_time: format(new Date(event.start_time), 'HH:mm'),
          end_time: format(new Date(event.end_time), 'HH:mm')
        }];
      }
      // Default for new events
      return [{ date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), start_time: '14:00', end_time: '17:00' }];
    })(),
    is_featured: event?.is_featured ?? false,
    status: event?.status ?? 'published' as 'draft' | 'published' | 'cancelled',
  });

  // ── Detect if current poster is from Supabase Storage ───────────────
  useEffect(() => {
    if (form.poster_url && form.poster_url.includes('supabase.co/storage/v1/object/public/event-posters')) {
      setPosterSource('upload');
    } else {
      setPosterSource('url');
    }
  }, [form.poster_url]);

  // ── Fetch approved proposals ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Fetch approved proposals
      const { data: proposals } = await supabase
        .from('hub_events')
        .select('id, title, description, organizer_name, organizer_email, organizer_phone, event_dates, expected_guests')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      setApprovedProposals((proposals as ApprovedProposal[]) ?? []);
    })();
  }, []);

  // ── Event date management functions ─────────────────────────────
  const addEventDate = (): void => {
    setForm({
      ...form,
      eventDates: [
        ...form.eventDates,
        { date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), start_time: '14:00', end_time: '17:00' }
      ]
    });
  };

  const removeEventDate = (index: number): void => {
    setForm({
      ...form,
      eventDates: form.eventDates.filter((_: EventDate, i: number) => i !== index)
    });
  };

  const updateEventDate = (index: number, field: 'date' | 'start_time' | 'end_time', value: string): void => {
    const updatedDates = [...form.eventDates];
    updatedDates[index] = { ...updatedDates[index], [field]: value };
    setForm({ ...form, eventDates: updatedDates });
  };

  // ── Pre-fill form from selected proposal ───────────────────────
  const handleProposalSelect = async (proposalId: string): Promise<void> => {
    setSelectedProposal(proposalId);
    if (!proposalId) return;

    const proposal = approvedProposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Pre-fill form with proposal data
    setForm({
      ...form,
      title: proposal.title,
      description: proposal.description,
      organizer: proposal.organizer_name,
      contact_email: proposal.organizer_email,
      contact_phone: proposal.organizer_phone,
      eventDates: Array.isArray(proposal.event_dates) && proposal.event_dates.length > 0 
        ? proposal.event_dates.map((d: any) => ({
            date: d.date || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
            start_time: d.start_time || '14:00',
            end_time: d.end_time || '17:00'
          }))
        : [{ date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), start_time: '14:00', end_time: '17:00' }]
    });
  };

  // ── Helpers ─────────────────────────────────────────────────────
  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'poster_url') setPosterPreviewError(false);
  };

  // ── Image upload handler ───────────────────────────────────────────
  const handleImageUpload = async (file: File): Promise<void> => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setPosterFile(file);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('event-posters')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-posters')
        .getPublicUrl(filePath);

      // Update form with public URL
      updateField('poster_url', publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setPosterFile(null);
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  // ── Handle poster source change ─────────────────────────────────────
  const handlePosterSourceChange = (source: 'upload' | 'url'): void => {
    setPosterSource(source);
    if (source === 'url') {
      setPosterFile(null);
    } else {
      // If switching to upload and there's a URL, clear it unless it's already from Supabase
      if (form.poster_url && !form.poster_url.includes('supabase.co/storage/v1/object/public/event-posters')) {
        updateField('poster_url', '');
      }
    }
  };

  /** Combine date + time strings into an ISO timestamp. */
  const toISO = (date: string, time: string): string => new Date(`${date}T${time}`).toISOString();

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Basic validation
    if (!form.title.trim()) { toast.error('Event title is required'); return; }
    if (form.eventDates.length === 0) { toast.error('At least one event date is required'); return; }

    // Validate each event date
    for (const eventDate of form.eventDates) {
      if (!eventDate.date || !eventDate.start_time || !eventDate.end_time) {
        toast.error('All event dates must have date, start time, and end time');
        return;
      }
      const startISO = toISO(eventDate.date, eventDate.start_time);
      const endISO = toISO(eventDate.date, eventDate.end_time);
      if (new Date(endISO) <= new Date(startISO)) {
        toast.error('End time must be after start time for all dates');
        return;
      }
    }

    setLoading(true);
    try {
      // Get current user id for created_by
      const { data: { user } } = await supabase.auth.getUser();

      // Use the first event date for start_time and end_time (for backward compatibility)
      const firstDate = form.eventDates[0];
      const startISO = toISO(firstDate.date, firstDate.start_time);
      const endISO = toISO(firstDate.date, firstDate.end_time);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        poster_url: form.poster_url.trim() || null,
        registration_link: form.registration_link.trim() || null,
        facebook_post_url: form.facebook_post_url.trim() || null,
        organizer: form.organizer.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        start_time: startISO,
        end_time: endISO,
        event_dates: form.eventDates,
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
    } catch (err: unknown) {
      console.error('Error saving event:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save event';
      toast.error(errorMessage);
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
          {/* ── Load from Approved Proposal (only for new events) ──────── */}
          {!isEditing && approvedProposals.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Sparkles className="inline w-4 h-4 mr-1 text-amber-500" />
                Load from Approved Proposal
              </label>
              <select
                value={selectedProposal}
                onChange={(e) => handleProposalSelect(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">— Select a proposal —</option>
                {approvedProposals.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select an approved proposal to pre-fill the form data</p>
            </div>
          )}

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

          {/* ── Event Dates & Times (Multiple) ──────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Event Dates & Times <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {form.eventDates.map((eventDate: EventDate, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={eventDate.date}
                      onChange={(e) => updateEventDate(index, 'date', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={eventDate.start_time}
                      onChange={(e) => updateEventDate(index, 'start_time', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={eventDate.end_time}
                        onChange={(e) => updateEventDate(index, 'end_time', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                        required
                      />
                    </div>
                    {form.eventDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEventDate(index)}
                        className="mt-5 text-red-500 hover:text-red-700"
                        title="Remove this date"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEventDate}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add another date
            </button>
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
              Event Poster
            </label>
            
            {/* Source toggle */}
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posterSource"
                  value="url"
                  checked={posterSource === 'url'}
                  onChange={() => handlePosterSourceChange('url')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">External URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posterSource"
                  value="upload"
                  checked={posterSource === 'upload'}
                  onChange={() => handlePosterSourceChange('upload')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Upload to Supabase</span>
              </label>
            </div>

            {/* External URL input */}
            {posterSource === 'url' && (
              <>
                <input
                  type="url"
                  value={form.poster_url}
                  onChange={(e) => updateField('poster_url', e.target.value)}
                  placeholder="https://example.com/poster.jpg"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Link to an image hosted elsewhere (Facebook, Google Drive, etc.)</p>
              </>
            )}

            {/* File upload input */}
            {posterSource === 'upload' && (
              <>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploadingImage}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, or GIF (max 5MB)</p>
                </div>
                
                {/* Upload progress */}
                {uploadingImage && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                )}
              </>
            )}

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

          {/* ── Facebook Post URL ─────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Link2 className="inline w-4 h-4 mr-1 text-blue-600" />
              Facebook Post URL
            </label>
            <input
              type="url"
              value={form.facebook_post_url}
              onChange={(e) => updateField('facebook_post_url', e.target.value)}
              placeholder="https://www.facebook.com/yourpage/posts/..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Link to the Facebook post for this event</p>
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
