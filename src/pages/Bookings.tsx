import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SpaceSelector from '../components/booking/SpaceSelector';
import TimeSlotPicker from '../components/booking/TimeSlotPicker';
import GuestBookingForm from '../components/booking/GuestBookingForm';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Space {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  image_url?: string;
  location?: string;
  capacity: number;
  hourly_rate: number;
  amenities?: string[];
}

export default function Bookings() {
  const location = useLocation();
  const [step, setStep] = useState<'space' | 'time' | 'details'>('space');
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);

  useEffect(() => {
    // Check if we have pre-selected values from calendar
    if (location.state) {
      const { preselectedDate: date, preselectedSpace: spaceId, preselectedTime: time } = location.state;
      
      if (date) {
        setPreselectedDate(date);
      }
      
      if (spaceId) {
        // Fetch the space details
        fetchSpaceById(spaceId);
      }
      
      if (time && date) {
        // Set pre-selected time
        const [hours, minutes] = time.split(':');
        const startTime = new Date(date);
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setSelectedStartTime(startTime);
      }
    }
  }, [location.state]);

  const fetchSpaceById = async (spaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (!error && data) {
        setSelectedSpace(data);
        setStep('time');
      }
    } catch (error) {
      console.error('Error fetching space:', error);
    }
  };

  const handleSpaceSelect = (space: Space) => {
    setSelectedSpace(space);
    setStep('time');
  };

  const handleTimeSelect = (startTime: Date, endTime: Date) => {
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
    setStep('details');
  };

  const handleBookingSuccess = () => {
    // Reset form
    setStep('space');
    setSelectedSpace(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
  };

  const goBack = () => {
    if (step === 'details') {
      setStep('time');
    } else if (step === 'time') {
      setStep('space');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book a Space</h1>
        <p className="mt-2 text-gray-600">
          No account required! Just select a space, pick your time, and provide your contact details.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            <li className={`relative ${step === 'space' ? 'text-primary-600' : 'text-gray-500'}`}>
              <div className="flex items-center">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === 'space' ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                  1
                </span>
                <span className="ml-2 text-sm font-medium">Select Space</span>
              </div>
            </li>
            <li className={`relative ml-8 ${step === 'time' ? 'text-primary-600' : 'text-gray-500'}`}>
              <div className="flex items-center">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === 'time' ? 'bg-primary-600 text-white' : step === 'details' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                  2
                </span>
                <span className="ml-2 text-sm font-medium">Choose Time</span>
              </div>
            </li>
            <li className={`relative ml-8 ${step === 'details' ? 'text-primary-600' : 'text-gray-500'}`}>
              <div className="flex items-center">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === 'details' ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                  3
                </span>
                <span className="ml-2 text-sm font-medium">Your Details</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Back Button */}
      {step !== 'space' && (
        <button
          onClick={goBack}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {step === 'space' && (
          <SpaceSelector onSelect={handleSpaceSelect} />
        )}

        {step === 'time' && selectedSpace && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedSpace.name}
              </h2>
              <p className="text-gray-600">Select your booking time</p>
            </div>
            <TimeSlotPicker
              spaceId={selectedSpace.id}
              onSelect={handleTimeSelect}
              initialDate={preselectedDate || undefined}
              initialTime={selectedStartTime || undefined}
            />
          </div>
        )}

        {step === 'details' && selectedSpace && selectedStartTime && selectedEndTime && (
          <GuestBookingForm
            spaceId={selectedSpace.id}
            spaceName={selectedSpace.name}
            startTime={selectedStartTime}
            endTime={selectedEndTime}
            onSuccess={handleBookingSuccess}
            onCancel={goBack}
          />
        )}
      </div>
    </div>
  );
}
