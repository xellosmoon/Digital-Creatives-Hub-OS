import { supabase } from './supabase';

// Simple email service for now - in production, integrate with SendGrid, AWS SES, etc.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sendEmail = async (to: string, subject: string, body: string) => {
  console.log('Sending email:', { to, subject });
  
  // Store notification in database
  try {
    await supabase.from('notifications').insert({
      recipient: to,
      subject,
      body,
      type: 'email',
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing notification:', error);
  }
  
  return { success: true };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const notifyAdminsOfNewBooking = async (bookingId: string) => {
  try {
    // Get admin emails
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin');

    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        space:spaces (name)
      `)
      .eq('id', bookingId)
      .single();

    if (!booking) return;

    // Send to each admin
    const emailPromises = (admins || []).map(admin => 
      sendEmail(
        admin.email,
        'New Booking Request',
        `New booking request for ${booking.space?.name} on ${booking.date}`
      )
    );

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('Error notifying admins:', error);
    return { success: false, error };
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const notifyGuestOfBookingUpdate = async (bookingId: string, approved: boolean) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        space:spaces (name)
      `)
      .eq('id', bookingId)
      .single();

    if (!booking || !booking.guest_email) return;

    const subject = approved 
      ? `Booking Approved - ${booking.space?.name}`
      : `Booking Update - ${booking.space?.name}`;

    const body = approved
      ? `Your booking for ${booking.space?.name} on ${booking.date} has been approved!`
      : `Your booking request for ${booking.space?.name} could not be approved.`;

    await sendEmail(booking.guest_email, subject, body);
    return { success: true };
  } catch (error) {
    console.error('Error notifying guest:', error);
    return { success: false, error };
  }
};
