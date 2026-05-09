export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number; // e.g., every 2 weeks
  endDate?: Date;
  occurrences?: number; // alternative to endDate
  daysOfWeek?: number[]; // for weekly: 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number; // for monthly
}

export interface RecurringBookingRequest {
  spaceId: string;
  startTime: Date;
  endTime: Date;
  purpose: string;
  attendees: number;
  recurrence: RecurrenceConfig;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface RecurringBookingPreview {
  dates: Date[];
  conflicts: Date[];
  available: Date[];
}
