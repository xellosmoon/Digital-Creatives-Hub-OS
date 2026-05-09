export interface OperatingHours {
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  isClosed: boolean;
}

export interface BlackoutDate {
  id: string;
  spaceId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  createdAt: Date;
  createdBy: string;
}

export interface SpaceAvailability {
  spaceId: string;
  operatingHours: OperatingHours[];
  blackoutDates: BlackoutDate[];
}

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
}
