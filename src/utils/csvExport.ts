export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatBookingForExport(booking: Record<string, unknown>): Record<string, string> {
  return {
    'Reference': String(booking.booking_reference || booking.id || ''),
    'Package': String((booking.package as Record<string, unknown>)?.name || 'N/A'),
    'Guest Name': String(booking.guest_name || 'N/A'),
    'Guest Email': String(booking.guest_email || 'N/A'),
    'Guest Phone': String(booking.guest_phone || 'N/A'),
    'Date': String(booking.booking_date || 'N/A'),
    'Start Time': booking.start_time ? new Date(String(booking.start_time)).toLocaleTimeString() : 'N/A',
    'End Time': booking.end_time ? new Date(String(booking.end_time)).toLocaleTimeString() : 'N/A',
    'Seats': String(booking.seats_used || 1),
    'Status': String(booking.status || ''),
    'Purpose': String(booking.purpose || 'N/A'),
    'Total Price': booking.total_price ? `₱${booking.total_price}` : 'N/A',
    'Created At': booking.created_at ? new Date(String(booking.created_at)).toLocaleString() : 'N/A',
  };
}

export function formatAttendanceForDTIExport(attendance: Record<string, unknown>): Record<string, string> {
  return {
    'Full Name': String(attendance.full_name || 'N/A'),
    'Creative Domain (PCIDA)': String(attendance.creative_domain || 'N/A'),
    'Organization': String(attendance.organization || 'N/A'),
    'Designation': String(attendance.designation || 'N/A'),
    'Sector': String(attendance.sector || 'N/A'),
    'Gender': String(attendance.gender || 'N/A'),
    'Mobile': String(attendance.mobile_number || 'N/A'),
    'Email': String(attendance.email || 'N/A'),
    'Status': String(attendance.status || 'N/A'),
    'Time In': attendance.check_in_time ? new Date(String(attendance.check_in_time)).toLocaleTimeString() : 'N/A',
    'Confirmed At': attendance.confirmed_at ? new Date(String(attendance.confirmed_at)).toLocaleTimeString() : '',
    'Time Out': attendance.check_out_time ? new Date(String(attendance.check_out_time)).toLocaleTimeString() : '',
    'Walk-in': attendance.is_walk_in ? 'Yes' : 'No',
    'Date': attendance.check_in_time ? new Date(String(attendance.check_in_time)).toLocaleDateString() : 'N/A',
  };
}

export function formatAnalyticsForExport(analytics: Record<string, unknown>): Record<string, string>[] {
  const exportData: Record<string, string>[] = [];
  
  // Summary data
  exportData.push({
    'Metric': 'Total Bookings',
    'Value': String(analytics.totalBookings || 0)
  });
  exportData.push({
    'Metric': 'Total Revenue',
    'Value': `₱${Number(analytics.totalRevenue || 0).toFixed(2)}`
  });
  exportData.push({
    'Metric': 'Average Booking Duration',
    'Value': `${Number(analytics.averageBookingDuration || 0).toFixed(1)} hours`
  });
  
  const bookingsByStatus = analytics.bookingsByStatus as Record<string, unknown> || {};
  const totalBookings = Number(analytics.totalBookings || 0);
  const approvedCount = Number(bookingsByStatus.approved || 0);
  
  if (totalBookings > 0) {
    exportData.push({
      'Metric': 'Approval Rate',
      'Value': `${((approvedCount / totalBookings) * 100).toFixed(0)}%`
    });
  }
  
  // Add a separator
  exportData.push({ 'Metric': '', 'Value': '' });
  exportData.push({ 'Metric': 'Space Utilization', 'Value': '' });
  
  // Space utilization
  const spaceUtilization = analytics.spaceUtilization as Record<string, unknown> || {};
  Object.entries(spaceUtilization).forEach(([space, count]) => {
    exportData.push({
      'Metric': space,
      'Value': String(count || 0)
    });
  });
  
  // Add another separator
  exportData.push({ 'Metric': '', 'Value': '' });
  exportData.push({ 'Metric': 'Top Spaces by Revenue', 'Value': '' });
  
  // Popular spaces
  const popularSpaces = analytics.popularSpaces as Array<{ name: string; revenue: number; bookings: number }> || [];
  popularSpaces.forEach((space) => {
    exportData.push({
      'Metric': space.name,
      'Value': `₱${space.revenue.toFixed(2)} (${space.bookings} bookings)`
    });
  });
  
  return exportData;
}
