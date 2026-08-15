import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, ArrowLeft, Share2, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CalendarEvent } from '../types';

export default function EventDetails(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchEvent = async (): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (err) {
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Event not found</p>
          <button
            onClick={() => navigate('/calendar')}
            className="text-violet-600 hover:text-violet-700 font-medium"
          >
            Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEventDate = (): string => {
    if (event.event_dates && event.event_dates.length > 0) {
      return formatDate(event.event_dates[0].date);
    }
    return 'Date TBD';
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Calendar
          </button>
        </div>
      </div>

      {/* Event Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Event Hero */}
          {event.image_url && (
            <div className="h-64 bg-gradient-to-br from-violet-500 to-purple-600 relative">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* Title and Status */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                {event.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                    <CalendarIcon className="h-4 w-4" />
                    Featured Event
                  </span>
                )}
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Share2 className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <p className="font-medium text-gray-900">{getEventDate()}</p>
                </div>
              </div>

              {event.event_dates && event.event_dates.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Clock className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Time</p>
                    <p className="font-medium text-gray-900">
                      {formatTime(event.event_dates[0].start_time)} - {formatTime(event.event_dates[0].end_time)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900">Digital Creatives Hub</p>
                </div>
              </div>

              {(event.organizer || event.organization) && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <User className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Hosted By</p>
                    <p className="font-medium text-gray-900">{event.organizer || event.organization}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>

            {/* Registration Link */}
            {event.registration_link && (
              <div className="mb-8">
                <a
                  href={event.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
                >
                  Register for this event →
                </a>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => navigate('/bookings')}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg"
            >
              Book a Seat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
