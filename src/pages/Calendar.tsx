import PublicCalendar from '../components/calendar/PublicCalendar';

export default function Calendar() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Space Availability</h1>
        <p className="mt-2 text-gray-600">
          View available spaces and current bookings. Click on a date to see detailed information.
        </p>
      </div>

      <PublicCalendar />

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Privacy Notice</h3>
        <p className="text-sm text-blue-700">
          Booking information is displayed according to privacy settings. 
          Coworking space bookings show anonymous occupancy counts, while event bookings 
          may display organizer information if configured by the admin.
        </p>
      </div>
    </div>
  );
}
