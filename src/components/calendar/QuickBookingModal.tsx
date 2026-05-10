import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Calendar, Clock, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface QuickBookingModalProps {
  date: Date;
  onClose: () => void;
}

interface Space {
  id: string;
  name: string;
  type: string;
  hourly_rate: number;
  capacity: number;
}

export default function QuickBookingModal({ date, onClose }: QuickBookingModalProps) {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    fetchAvailableSpaces();
  }, [date]);

  const fetchAvailableSpaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBook = () => {
    if (!selectedSpace) {
      toast.error('Please select a space');
      return;
    }

    // Navigate to booking page with pre-selected date and space
    navigate('/bookings', {
      state: {
        preselectedDate: date,
        preselectedSpace: selectedSpace,
        preselectedTime: selectedTime
      }
    });
    onClose();
  };

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00'
  ];

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Book</h2>
            <p className="text-sm text-gray-600 mt-1">
              <Calendar className="inline w-4 h-4 mr-1" />
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading available spaces...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Space Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Select a Space</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {spaces.map((space) => (
                    <button
                      key={space.id}
                      onClick={() => setSelectedSpace(space.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedSpace === space.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">{space.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{space.type}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-500">
                          <Users className="inline w-4 h-4 mr-1" />
                          Up to {space.capacity} people
                        </span>
                        <span className="font-medium text-primary-600">
                          ₱{space.hourly_rate}/hr
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  <Clock className="inline w-5 h-5 mr-1" />
                  Preferred Time (Optional)
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

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleQuickBook}
            disabled={!selectedSpace}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue Booking
          </button>
        </div>
      </div>
    </div>
  );
}
