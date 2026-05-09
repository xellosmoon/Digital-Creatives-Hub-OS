import { useState, useEffect } from 'react';
import { Calendar, Clock, X, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SpaceAvailabilityProps {
  spaceId: string;
  spaceName: string;
  onClose: () => void;
}

interface AvailabilitySchedule {
  id?: string;
  space_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlackoutDate {
  id?: string;
  space_id: string;
  date: string;
  reason?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SpaceAvailability({ spaceId, spaceName, onClose }: SpaceAvailabilityProps) {
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [newBlackoutReason, setNewBlackoutReason] = useState('');

  useEffect(() => {
    fetchAvailability();
  }, [spaceId]);

  const fetchAvailability = async () => {
    try {
      // Fetch availability schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('space_availability')
        .select('*')
        .eq('space_id', spaceId)
        .order('day_of_week');

      if (schedulesError) throw schedulesError;

      // If no schedules exist, create default ones (9 AM - 6 PM, Monday-Friday)
      if (!schedulesData || schedulesData.length === 0) {
        const defaultSchedules: AvailabilitySchedule[] = [];
        for (let day = 0; day < 7; day++) {
          defaultSchedules.push({
            space_id: spaceId,
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            is_available: day >= 1 && day <= 5 // Monday-Friday
          });
        }
        setSchedules(defaultSchedules);
      } else {
        setSchedules(schedulesData);
      }

      // Fetch blackout dates
      const { data: blackoutData, error: blackoutError } = await supabase
        .from('space_blackout_dates')
        .select('*')
        .eq('space_id', spaceId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date');

      if (blackoutError) throw blackoutError;
      setBlackoutDates(blackoutData || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (dayIndex: number, field: keyof AvailabilitySchedule, value: any) => {
    setSchedules(prev => prev.map((schedule, index) => 
      index === dayIndex ? { ...schedule, [field]: value } : schedule
    ));
  };

  const handleAddBlackoutDate = () => {
    if (!newBlackoutDate) {
      toast.error('Please select a date');
      return;
    }

    const newBlackout: BlackoutDate = {
      space_id: spaceId,
      date: newBlackoutDate,
      reason: newBlackoutReason
    };

    setBlackoutDates(prev => [...prev, newBlackout].sort((a, b) => a.date.localeCompare(b.date)));
    setNewBlackoutDate('');
    setNewBlackoutReason('');
  };

  const handleRemoveBlackoutDate = (index: number) => {
    setBlackoutDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save availability schedules
      for (const schedule of schedules) {
        if (schedule.id) {
          // Update existing
          const { error } = await supabase
            .from('space_availability')
            .update({
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              is_available: schedule.is_available
            })
            .eq('id', schedule.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('space_availability')
            .insert(schedule);

          if (error) throw error;
        }
      }

      // Handle blackout dates
      // First, get existing blackout dates from database
      const { data: existingBlackouts, error: fetchError } = await supabase
        .from('space_blackout_dates')
        .select('id, date')
        .eq('space_id', spaceId);

      if (fetchError) throw fetchError;

      // Delete removed blackout dates
      const existingDates = existingBlackouts?.map(b => b.date) || [];
      const currentDates = blackoutDates.map(b => b.date);
      const datesToDelete = existingBlackouts?.filter(b => !currentDates.includes(b.date)) || [];

      for (const blackout of datesToDelete) {
        const { error } = await supabase
          .from('space_blackout_dates')
          .delete()
          .eq('id', blackout.id);

        if (error) throw error;
      }

      // Insert new blackout dates
      const newDates = blackoutDates.filter(b => !b.id);
      if (newDates.length > 0) {
        const { error } = await supabase
          .from('space_blackout_dates')
          .insert(newDates);

        if (error) throw error;
      }

      toast.success('Availability settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Availability Settings - {spaceName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Weekly Schedule */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Weekly Schedule
            </h3>
            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-32">
                    <span className="font-medium text-gray-700">{DAYS_OF_WEEK[schedule.day_of_week]}</span>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={schedule.is_available}
                      onChange={(e) => handleScheduleChange(index, 'is_available', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Available</span>
                  </label>
                  {schedule.is_available && (
                    <>
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blackout Dates */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Blackout Dates
            </h3>
            
            {/* Add new blackout date */}
            <div className="flex items-end space-x-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={newBlackoutReason}
                  onChange={(e) => setNewBlackoutReason(e.target.value)}
                  placeholder="e.g., Holiday, Maintenance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                onClick={handleAddBlackoutDate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* List of blackout dates */}
            {blackoutDates.length > 0 ? (
              <div className="space-y-2">
                {blackoutDates.map((blackout, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-700">
                        {format(parseISO(blackout.date), 'MMMM d, yyyy')}
                      </span>
                      {blackout.reason && (
                        <span className="ml-2 text-sm text-gray-500">- {blackout.reason}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBlackoutDate(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No blackout dates set</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
