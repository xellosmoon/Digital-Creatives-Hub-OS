export function exportToCSV(data: any[], filename: string) {
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

export function formatBookingForExport(booking: any) {
  return {
    'Reference': booking.booking_reference || booking.id,
    'Package': booking.package?.name || 'N/A',
    'Guest Name': booking.guest_name || 'N/A',
    'Guest Email': booking.guest_email || 'N/A',
    'Guest Phone': booking.guest_phone || 'N/A',
    'Date': booking.booking_date || 'N/A',
    'Start Time': booking.start_time ? new Date(booking.start_time).toLocaleTimeString() : 'N/A',
    'End Time': booking.end_time ? new Date(booking.end_time).toLocaleTimeString() : 'N/A',
    'Seats': booking.seats_used || 1,
    'Status': booking.status,
    'Purpose': booking.purpose || 'N/A',
    'Total Price': booking.total_price ? `₱${booking.total_price}` : 'N/A',
    'Created At': new Date(booking.created_at).toLocaleString(),
  };
}

export function formatAttendanceForDTIExport(attendance: any) {
  return {
    'Full Name': attendance.full_name || 'N/A',
    'Creative Domain (PCIDA)': attendance.creative_domain || 'N/A',
    'Organization': attendance.organization || 'N/A',
    'Designation': attendance.designation || 'N/A',
    'Sector': attendance.sector || 'N/A',
    'Gender': attendance.gender || 'N/A',
    'Mobile': attendance.mobile_number || 'N/A',
    'Email': attendance.email || 'N/A',
    'Status': attendance.status || 'N/A',
    'Time In': attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString() : 'N/A',
    'Confirmed At': attendance.confirmed_at ? new Date(attendance.confirmed_at).toLocaleTimeString() : '',
    'Time Out': attendance.check_out_time ? new Date(attendance.check_out_time).toLocaleTimeString() : '',
    'Walk-in': attendance.is_walk_in ? 'Yes' : 'No',
    'Date': attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleDateString() : 'N/A',
  };
}

export function formatAnalyticsForExport(analytics: any) {
  const exportData: any[] = [];
  
  // Summary data
  exportData.push({
    'Metric': 'Total Bookings',
    'Value': analytics.totalBookings
  });
  exportData.push({
    'Metric': 'Total Revenue',
    'Value': `₱${analytics.totalRevenue.toFixed(2)}`
  });
  exportData.push({
    'Metric': 'Average Booking Duration',
    'Value': `${analytics.averageBookingDuration.toFixed(1)} hours`
  });
  exportData.push({
    'Metric': 'Approval Rate',
    'Value': `${((analytics.bookingsByStatus.approved / analytics.totalBookings) * 100).toFixed(0)}%`
  });
  
  // Add a separator
  exportData.push({ 'Metric': '', 'Value': '' });
  exportData.push({ 'Metric': 'Space Utilization', 'Value': '' });
  
  // Space utilization
  Object.entries(analytics.spaceUtilization).forEach(([space, count]) => {
    exportData.push({
      'Metric': space,
      'Value': count
    });
  });
  
  // Add another separator
  exportData.push({ 'Metric': '', 'Value': '' });
  exportData.push({ 'Metric': 'Top Spaces by Revenue', 'Value': '' });
  
  // Popular spaces
  analytics.popularSpaces.forEach((space: any) => {
    exportData.push({
      'Metric': space.name,
      'Value': `₱${space.revenue.toFixed(2)} (${space.bookings} bookings)`
    });
  });
  
  return exportData;
}
