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
    'Booking ID': booking.id,
    'Space': booking.space?.name || 'N/A',
    'User Name': booking.user_name,
    'User Email': booking.user_email,
    'Date': new Date(booking.date).toLocaleDateString(),
    'Start Time': booking.start_time,
    'End Time': booking.end_time,
    'Attendees': booking.attendees,
    'Status': booking.status,
    'Purpose': booking.purpose || 'N/A',
    'Total Cost': booking.total_cost ? `₱${booking.total_cost}` : 'N/A',
    'Created At': new Date(booking.created_at).toLocaleString(),
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
