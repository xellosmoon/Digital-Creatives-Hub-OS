import { Calendar as CalendarIcon, Star, Users, AlertTriangle, Wrench } from 'lucide-react';
import PublicCalendar from '../components/calendar/PublicCalendar';

export default function Calendar() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Hub Availability & Events</h1>
        <p className="mt-2 text-gray-600">
          See real-time seat occupancy, upcoming events, and workshops.
          Click a date to book a seat or click an event for details.
        </p>
      </div>

      <PublicCalendar />

      {/* Color legend matching the new hub capacity model */}
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
        {/* Occupancy bar */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-8 h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400" />
          Seat Occupancy
        </div>
        {/* Coworking */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-primary-100 border border-primary-300" />
          <Users className="w-3.5 h-3.5" /> Coworking
        </div>
        {/* Workshop */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-red-100 border border-red-300" />
          <AlertTriangle className="w-3.5 h-3.5" /> Workshop Block
        </div>
        {/* Bundle */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-purple-100 border border-purple-300" />
          <Wrench className="w-3.5 h-3.5" /> Bundle Package
        </div>
        {/* Events */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-amber-100 border border-amber-300" />
          <CalendarIcon className="w-3.5 h-3.5" /> Events
        </div>
        {/* Featured */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-amber-100 border border-amber-300" />
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Featured
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
        <p className="text-sm text-blue-700">
          The hub has 28 total seats across two bookable zones (Tech Zone & Creative Zone).
          Individual coworking bookings are grouped into seat counts. Workshops may block
          entire zones. Bundles (Creative Suite, Production Access) reserve equipment + seats.
        </p>
      </div>
    </div>
  );
}
