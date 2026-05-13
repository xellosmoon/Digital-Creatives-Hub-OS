import { format } from 'date-fns';
import {
  X, Calendar, Clock, MapPin, Users, Mail, Phone,
  ExternalLink, Share2, Facebook, Star,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../../types';

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
export default function EventDetailsModal({ event, onClose, onBookSpace }: EventDetailsModalProps) {
  const [imageError, setImageError] = useState(false);

  // ── Social sharing helpers ──────────────────────────────────────
  const handleShare = async () => {
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

  const handleFacebookShare = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

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
            /* Gradient fallback when no poster is available */
            <div className="w-full h-72 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <div className="text-center text-white px-6">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-bold">{event.title}</h2>
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
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto">
          {/* Title & organizer */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{event.title}</h1>
            {event.organizer && (
              <p className="text-lg text-gray-600">Organized by {event.organizer}</p>
            )}
          </div>

          {/* Key information grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Date</p>
                <p className="text-gray-600">
                  {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Time</p>
                <p className="text-gray-600">
                  {format(new Date(event.start_time), 'h:mm a')} –{' '}
                  {format(new Date(event.end_time), 'h:mm a')}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Venue</p>
                <p className="text-gray-600">
                  {event.space?.name || 'Digital Creatives Hub'}
                </p>
                {event.space?.location && (
                  <p className="text-sm text-gray-500">{event.space.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Status</p>
                <p className="text-gray-600 capitalize">{event.status}</p>
              </div>
            </div>
          </div>

          {/* ── Registration call-to-action ──────────────────────── */}
          {event.registration_link && (
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <h3 className="font-semibold text-primary-900 mb-2">Registration</h3>
              <p className="text-sm text-primary-700 mb-3">
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
              <h3 className="font-medium text-gray-900 mb-2">About this Event</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Contact information */}
          {(event.contact_email || event.contact_phone) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2">
                {event.contact_email && (
                  <a
                    href={`mailto:${event.contact_email}`}
                    className="flex items-center text-primary-600 hover:text-primary-700"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {event.contact_email}
                  </a>
                )}
                {event.contact_phone && (
                  <a
                    href={`tel:${event.contact_phone}`}
                    className="flex items-center text-primary-600 hover:text-primary-700"
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
                         border border-gray-300 text-base font-medium rounded-md
                         text-gray-700 bg-white hover:bg-gray-50"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share Event
            </button>

            <button
              onClick={handleFacebookShare}
              className="inline-flex items-center justify-center px-4 py-3
                         border border-gray-300 text-base font-medium rounded-md
                         text-gray-700 bg-white hover:bg-gray-50"
            >
              <Facebook className="h-5 w-5" />
            </button>
          </div>

          {/* Book Other Spaces Link */}
          {onBookSpace && (
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-2">Need to book a space for your own event?</p>
              <button
                onClick={onBookSpace}
                className="text-primary-600 hover:text-primary-700 font-medium"
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
