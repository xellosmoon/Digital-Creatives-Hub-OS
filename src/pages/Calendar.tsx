import { Calendar as CalendarIcon, Star, Users, AlertTriangle, Wrench } from 'lucide-react';
import PublicCalendar from '../components/calendar/PublicCalendar';

export default function Calendar(): JSX.Element {
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
        {/* Advance bookings bar */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-8 h-2 rounded-full bg-indigo-400" />
          Reserved
        </div>
        {/* Live floor occupancy bar */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-8 h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400" />
          Peak/Checked In
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
        {/* Tech & Dev */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-cyan-100 border border-cyan-300" />
          <CalendarIcon className="w-3.5 h-3.5 text-cyan-700" /> Tech & Dev
        </div>
        {/* Workshops (Events) */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-amber-100 border border-amber-300" />
          <CalendarIcon className="w-3.5 h-3.5 text-amber-700" /> Workshops
        </div>
        {/* Community */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-700" /> Community
        </div>
        {/* Other Events */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded bg-blue-100 border border-blue-300" />
          <CalendarIcon className="w-3.5 h-3.5 text-blue-700" /> Other Events
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
