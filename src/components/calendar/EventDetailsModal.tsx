import { format } from 'date-fns';
import { X, Calendar, Clock, MapPin, Users, Mail, Phone, ExternalLink, Share2, Facebook } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface EventDetailsModalProps {
  event: any;
  onClose: () => void;
  onBookSpace?: () => void;
}

export default function EventDetailsModal({ event, onClose, onBookSpace }: EventDetailsModalProps) {
  const [imageError, setImageError] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${event.event_title} at Creative Coworking - ${format(new Date(event.start_time), 'MMM d, yyyy')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.event_title,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback - copy to clipboard
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header with poster */}
        <div className="relative">
          {event.event_poster_url && !imageError ? (
            <img
              src={event.event_poster_url}
              alt={event.event_title}
              className="w-full h-64 object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <div className="text-center text-white">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-bold">{event.event_title}</h2>
              </div>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Event Details */}
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.event_title}</h1>
            {event.event_organizer && (
              <p className="text-lg text-gray-600">Organized by {event.event_organizer}</p>
            )}
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Date</p>
                <p className="text-gray-600">{format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Time</p>
                <p className="text-gray-600">
                  {format(new Date(event.start_time), 'h:mm a')} - 
                  {format(new Date(event.end_time), 'h:mm a')}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Venue</p>
                <p className="text-gray-600">{event.spaces?.name || 'Creative Coworking'}</p>
                {event.spaces?.location && (
                  <p className="text-sm text-gray-500">{event.spaces.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Capacity</p>
                <p className="text-gray-600">{event.attendees || 'Open'} attendees</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.event_description && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">About this Event</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{event.event_description}</p>
            </div>
          )}

          {/* Contact Information */}
          {(event.event_contact_email || event.event_contact_phone) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2">
                {event.event_contact_email && (
                  <a
                    href={`mailto:${event.event_contact_email}`}
                    className="flex items-center text-primary-600 hover:text-primary-700"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {event.event_contact_email}
                  </a>
                )}
                {event.event_contact_phone && (
                  <a
                    href={`tel:${event.event_contact_phone}`}
                    className="flex items-center text-primary-600 hover:text-primary-700"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {event.event_contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {event.event_registration_link && (
              <a
                href={event.event_registration_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Register Now
              </a>
            )}
            
            <button
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share Event
            </button>

            <button
              onClick={handleFacebookShare}
              className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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
