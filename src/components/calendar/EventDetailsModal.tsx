import { format } from 'date-fns';
import {
  X, Calendar, Clock, MapPin, Users, Mail, Phone,
  ExternalLink, Share2, Facebook, Star, Sparkles, Zap,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../../types';

interface EventDate {
  date: string;
  start_time: string;
  end_time: string;
}

// ── Props ───────────────────────────────────────────────────────────
interface EventDetailsModalProps {
  /** The event to display — sourced from the `events` table. */
  event: CalendarEvent;
  onClose: () => void;
  /** Optional callback so the user can jump to the booking flow for this date. */
  onBookSpace?: () => void;
}

/**
 * Full-screen modal that shows event details including the poster image,
 * registration link, organizer, description, and contact information.
 * Opened when the user clicks an event chip inside the calendar grid.
 */
export default function EventDetailsModal({ event, onClose, onBookSpace }: EventDetailsModalProps): JSX.Element {
  const [imageError, setImageError] = useState(false);

  // ── Event type detection ─────────────────────────────────────────
  const getEventIcon = () => {
    const isWorkshop = event.title.toLowerCase().includes('workshop') ||
                       event.title.toLowerCase().includes('training') ||
                       event.title.toLowerCase().includes('bootcamp');
    if (isWorkshop) return Zap;
    if (event.is_featured) return Sparkles;
    return Calendar;
  };

  const getEventGradient = () => {
    const isWorkshop = event.title.toLowerCase().includes('workshop') ||
                       event.title.toLowerCase().includes('training') ||
                       event.title.toLowerCase().includes('bootcamp');
    if (isWorkshop) return 'from-orange-500 via-amber-500 to-red-500';
    if (event.is_featured) return 'from-purple-500 via-pink-500 to-indigo-500';
    return 'from-blue-500 via-cyan-500 to-indigo-500';
  };

  // ── Social sharing helpers ──────────────────────────────────────
  const handleShare = async (): Promise<void> => {
    const shareUrl = window.location.href;
    const shareText = `${event.title} at Creative Coworking - ${format(new Date(event.start_time), 'MMM d, yyyy')}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleFacebookShare = (): void => {
    const shareUrl = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Poster / Header ─────────────────────────────────────── */}
        <div className="relative flex-shrink-0">
          {event.poster_url && !imageError ? (
            <img
              src={event.poster_url}
              alt={event.title}
              className="w-full h-72 object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            /* Enhanced gradient fallback when no poster is available */
            <div className={`w-full h-72 bg-gradient-to-br ${getEventGradient()} relative overflow-hidden`}>
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
              </div>
              
              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center text-white px-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-2xl">
                  {(() => {
                    const Icon = getEventIcon();
                    return <Icon className="w-10 h-10" />;
                  })()}
                </div>
                <h2 className="text-2xl font-bold text-center max-w-lg">{event.title}</h2>
                <p className="text-white/80 text-sm mt-2">{format(new Date(event.start_time), 'MMMM d, yyyy')}</p>
              </div>
            </div>
          )}

          {/* Featured badge */}
          {event.is_featured && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-xs font-semibold shadow">
              <Star className="w-3.5 h-3.5 fill-amber-900" /> Featured
            </span>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto">
          {/* Title & organizer */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{event.title}</h1>
            {(event.organization || event.organizer) && (
              <p className="text-lg text-gray-600 dark:text-gray-400">Hosted by {event.organization || event.organizer}</p>
            )}
          </div>

          {/* Key information grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Date</p>
                {event.event_dates && Array.isArray(event.event_dates) && event.event_dates.length > 1 ? (
                  <div className="space-y-1.5 mt-1 max-h-36 overflow-y-auto pr-2">
                    {event.event_dates.map((d: EventDate, idx: number) => {
                      if (!d.date) return null;
                      try {
                        const dateParts = d.date.split('-');
                        const localDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                        return (
                          <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded px-2.5 py-1 border border-gray-100 dark:border-slate-600">
                            {format(localDate, 'EEE, MMM d, yyyy')} • {d.start_time} – {d.end_time}
                          </div>
                        );
                      } catch (e) {
                        return null;
                      }
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {(!event.event_dates || !Array.isArray(event.event_dates) || event.event_dates.length <= 1) && (
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Time</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {format(new Date(event.start_time), 'h:mm a')} –{' '}
                    {format(new Date(event.end_time), 'h:mm a')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Venue</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {event.space?.name || 'Digital Creatives Hub'}
                </p>
                {event.space?.location && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{event.space.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Status</p>
                <p className="text-gray-600 dark:text-gray-400 capitalize">{event.status}</p>
              </div>
            </div>
          </div>

          {/* ── Registration call-to-action ──────────────────────── */}
          {event.registration_link && (
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
              <h3 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">Registration</h3>
              <p className="text-sm text-primary-700 dark:text-primary-400 mb-3">
                Spots may be limited — register early to secure your place.
              </p>
              <a
                href={event.registration_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-6 py-3
                           text-base font-medium rounded-md text-white
                           bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Register Now
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">About this Event</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Contact information */}
          {(event.contact_email || event.contact_phone) && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h3>
              <div className="space-y-2">
                {event.contact_email && (
                  <a
                    href={`mailto:${event.contact_email}`}
                    className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {event.contact_email}
                  </a>
                )}
                {event.contact_phone && (
                  <a
                    href={`tel:${event.contact_phone}`}
                    className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {event.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Share buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center px-6 py-3
                         border border-gray-300 dark:border-slate-600 text-base font-medium rounded-md
                         text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share Event
            </button>

            <button
              onClick={handleFacebookShare}
              className="inline-flex items-center justify-center px-4 py-3
                         border border-gray-300 dark:border-slate-600 text-base font-medium rounded-md
                         text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Facebook className="h-5 w-5" />
            </button>
          </div>

          {/* Book Other Spaces Link */}
          {onBookSpace && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Need to book a space for your own event?</p>
              <button
                onClick={onBookSpace}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Check available spaces →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
