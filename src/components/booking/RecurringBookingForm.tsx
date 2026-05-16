import React, { useState } from 'react';
import { RecurrencePattern, RecurrenceConfig } from '../../types/recurring';
import { Calendar, Repeat, AlertCircle } from 'lucide-react';

interface RecurringBookingFormProps {
  onRecurrenceChange: (config: RecurrenceConfig | null) => void;
}

export const RecurringBookingForm: React.FC<RecurringBookingFormProps> = ({
  onRecurrenceChange,
}) => {
  const [isRecurring, setIsRecurring] = useState(false);
  const [pattern, setPattern] = useState<RecurrencePattern>('weekly');
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<'date' | 'occurrences'>('occurrences');
  const [endDate, setEndDate] = useState('');
  const [occurrences, setOccurrences] = useState(10);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  const handleRecurringChange = (checked: boolean): void => {
    setIsRecurring(checked);
    if (!checked) {
      onRecurrenceChange(null);
    } else {
      updateRecurrence();
    }
  };

  const updateRecurrence = (): void => {
    if (!isRecurring) {
      onRecurrenceChange(null);
      return;
    }

    const config: RecurrenceConfig = {
      pattern,
      interval,
    };

    if (endType === 'date' && endDate) {
      config.endDate = new Date(endDate);
    } else if (endType === 'occurrences') {
      config.occurrences = occurrences;
    }

    if (pattern === 'weekly' && selectedDays.length > 0) {
      config.daysOfWeek = selectedDays;
    }

    if (pattern === 'monthly') {
      config.dayOfMonth = dayOfMonth;
    }

    onRecurrenceChange(config);
  };

  React.useEffect(() => {
    if (isRecurring) {
      updateRecurrence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, interval, endType, endDate, occurrences, selectedDays, dayOfMonth]);

  const toggleDay = (day: number): void => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="recurring"
          checked={isRecurring}
          onChange={(e) => handleRecurringChange(e.target.checked)}
          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
        <label htmlFor="recurring" className="flex items-center space-x-2 cursor-pointer">
          <Repeat className="h-4 w-4" />
          <span className="font-medium">Make this a recurring booking</span>
        </label>
      </div>

      {isRecurring && (
        <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Pattern
            </label>
            <div className="flex items-center space-x-4">
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value as RecurrencePattern)}
                className="rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="flex items-center space-x-2">
                <span className="text-sm">Every</span>
                <input
                  type="number"
                  min="1"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  className="w-16 rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm">
                  {pattern === 'daily' && 'day(s)'}
                  {pattern === 'weekly' && 'week(s)'}
                  {pattern === 'monthly' && 'month(s)'}
                </span>
              </div>
            </div>
          </div>

          {pattern === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat on days
              </label>
              <div className="flex space-x-2">
                {daysOfWeek.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Please select at least one day
                </p>
              )}
            </div>
          )}

          {pattern === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                className="w-20 rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End recurrence
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="occurrences"
                  checked={endType === 'occurrences'}
                  onChange={(e) => setEndType(e.target.value as 'occurrences')}
                  className="mr-2 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm">After</span>
                <input
                  type="number"
                  min="1"
                  value={occurrences}
                  onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                  disabled={endType !== 'occurrences'}
                  className="mx-2 w-16 rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-gray-100"
                />
                <span className="text-sm">occurrences</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="date"
                  checked={endType === 'date'}
                  onChange={(e) => setEndType(e.target.value as 'date')}
                  className="mr-2 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm mr-2">On date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={endType !== 'date'}
                  min={new Date().toISOString().split('T')[0]}
                  className="rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-gray-100"
                />
              </label>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-md">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Preview</p>
                <p className="mt-1">
                  This will create {endType === 'occurrences' ? occurrences : 'multiple'} bookings
                  {pattern === 'daily' && ` every ${interval} day(s)`}
                  {pattern === 'weekly' && ` every ${interval} week(s) on selected days`}
                  {pattern === 'monthly' && ` every ${interval} month(s) on day ${dayOfMonth}`}
                  {endType === 'date' && endDate && ` until ${new Date(endDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
