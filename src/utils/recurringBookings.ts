import { RecurrenceConfig } from '../types/recurring';
import { addDays, addWeeks, addMonths, isBefore, isAfter, startOfDay } from 'date-fns';

export function generateRecurringDates(
  startDate: Date,
  config: RecurrenceConfig
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  // Determine the end condition
  const maxOccurrences = config.occurrences || 365; // Default max to prevent infinite loops
  const endDate = config.endDate || addMonths(startDate, 12); // Default to 1 year

  while (occurrenceCount < maxOccurrences && isBefore(currentDate, endDate)) {
    // For weekly recurrence, check if current day is in selected days
    if (config.pattern === 'weekly' && config.daysOfWeek) {
      const dayOfWeek = currentDate.getDay();
      if (config.daysOfWeek.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
        occurrenceCount++;
      }
    } else {
      // For daily and monthly patterns
      dates.push(new Date(currentDate));
      occurrenceCount++;
    }

    // Move to next date based on pattern
    switch (config.pattern) {
      case 'daily':
        currentDate = addDays(currentDate, config.interval);
        break;
      case 'weekly':
        // If we have specific days, move day by day
        if (config.daysOfWeek && config.daysOfWeek.length > 0) {
          currentDate = addDays(currentDate, 1);
        } else {
          currentDate = addWeeks(currentDate, config.interval);
        }
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, config.interval);
        // Handle day of month that doesn't exist (e.g., Feb 31)
        if (config.dayOfMonth) {
          const newMonth = currentDate.getMonth();
          currentDate.setDate(Math.min(
            config.dayOfMonth,
            new Date(currentDate.getFullYear(), newMonth + 1, 0).getDate()
          ));
        }
        break;
    }
  }

  return dates;
}

export function checkBookingConflicts(
  proposedDates: Date[],
  existingBookings: Array<{ startTime: Date; endTime: Date; spaceId: string }>,
  spaceId: string,
  duration: number // in minutes
): { available: Date[]; conflicts: Date[] } {
  const available: Date[] = [];
  const conflicts: Date[] = [];

  proposedDates.forEach(date => {
    const proposedStart = date;
    const proposedEnd = new Date(date.getTime() + duration * 60 * 1000);

    const hasConflict = existingBookings.some(booking => {
      if (booking.spaceId !== spaceId) return false;
      
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      // Check if there's any overlap
      return (
        (proposedStart >= bookingStart && proposedStart < bookingEnd) ||
        (proposedEnd > bookingStart && proposedEnd <= bookingEnd) ||
        (proposedStart <= bookingStart && proposedEnd >= bookingEnd)
      );
    });

    if (hasConflict) {
      conflicts.push(date);
    } else {
      available.push(date);
    }
  });

  return { available, conflicts };
}

export function formatRecurrenceDescription(config: RecurrenceConfig): string {
  let description = `Repeats ${config.pattern}`;
  
  if (config.interval > 1) {
    description += ` every ${config.interval} ${config.pattern === 'daily' ? 'days' : config.pattern === 'weekly' ? 'weeks' : 'months'}`;
  }

  if (config.pattern === 'weekly' && config.daysOfWeek) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = config.daysOfWeek.map(d => dayNames[d]).join(', ');
    description += ` on ${selectedDays}`;
  }

  if (config.pattern === 'monthly' && config.dayOfMonth) {
    description += ` on day ${config.dayOfMonth}`;
  }

  if (config.endDate) {
    description += ` until ${config.endDate.toLocaleDateString()}`;
  } else if (config.occurrences) {
    description += ` for ${config.occurrences} occurrences`;
  }

  return description;
}
