import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Calendar, Clock, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { RentalPackage } from '../../types/hub';

interface QuickBookingModalProps {
  date: Date;
  onClose: () => void;
}

/**
 * Quick-booking modal synced with the new hub capacity model.
 * Shows available seats for the selected date and lists rental packages.
 */
export default function QuickBookingModal({ date, onClose }: QuickBookingModalProps): JSX.Element {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<RentalPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSeats, setAvailableSeats] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Fetch packages and seat availability in parallel
      const [pkgRes, availRes] = await Promise.all([
        supabase
          .from('rental_packages')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .rpc('get_available_seats', { target_date: dateStr }),
      ]);

      if (pkgRes.error) throw pkgRes.error;
      setPackages(pkgRes.data ?? []);

      // get_available_seats RPC returns an integer
      setAvailableSeats(typeof availRes.data === 'number' ? availRes.data : null);
    } catch (err) {
      console.error('Error loading quick-book data:', err);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBook = (): void => {
    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    // Navigate to the booking page with preselected data
    navigate('/bookings', {
      state: {
        preselectedDate: date,
        preselectedPackage: selectedPackage,
        preselectedTime: selectedTime,
      },
    });
    onClose();
  };

  // Format pricing label
  const priceLabel = (pkg: RentalPackage): string => {
    if (pkg.hourly_rate && pkg.daily_rate) return `₱${pkg.hourly_rate}/hr or ₱${pkg.daily_rate}/day`;
    if (pkg.hourly_rate) return `₱${pkg.hourly_rate}/hr`;
    if (pkg.daily_rate) return `₱${pkg.daily_rate}/day`;
    return '';
  };

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00',
  ];

  const isSoldOut = availableSeats !== null && availableSeats <= 0;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Book a Seat</h2>
            <p className="text-sm text-gray-600 mt-1">
              <Calendar className="inline w-4 h-4 mr-1" />
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              <p className="mt-2 text-gray-600">Checking availability…</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seat availability banner */}
              {availableSeats !== null && (
                <div className={`flex items-center gap-3 rounded-lg p-3 text-sm font-medium ${
                  isSoldOut ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                  {isSoldOut ? (
                    <>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      Hub is fully booked for this date (0 seats left)
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5 flex-shrink-0" />
                      {availableSeats} seat{availableSeats > 1 ? 's' : ''} available
                    </>
                  )}
                </div>
              )}

              {/* Package Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Choose a Package</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {packages.map((pkg) => {
                    const notEnoughSeats = availableSeats !== null && pkg.seats_consumed > availableSeats;
                    return (
                      <button
                        key={pkg.id}
                        disabled={notEnoughSeats}
                        onClick={() => setSelectedPackage(pkg.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedPackage === pkg.id
                            ? 'border-primary-500 bg-primary-50'
                            : notEnoughSeats
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                        {pkg.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            <Users className="inline w-3.5 h-3.5 mr-0.5" />
                            {pkg.seats_consumed} seat{pkg.seats_consumed > 1 ? 's' : ''}
                          </span>
                          <span className="font-medium text-primary-600 text-sm">
                            {priceLabel(pkg)}
                          </span>
                        </div>
                        {pkg.is_bundle && (
                          <span className="mt-1 inline-block text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            Bundle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  <Clock className="inline w-5 h-5 mr-1" />
                  Preferred Start Time (Optional)
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedTime === time
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleQuickBook}
            disabled={!selectedPackage || isSoldOut}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue Booking
          </button>
        </div>
      </div>
    </div>
  );
}
