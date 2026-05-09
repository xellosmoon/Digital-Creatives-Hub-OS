# Digital Creatives Hub OS - Masterplan

## Project: Digital Creatives Hub OS

**Tech Stack:**
- **Frontend:** React + Vite (using TypeScript)
- **Styling:** Tailwind CSS
- **Backend & Database:** Supabase
- **Hosting:** Netlify

---

## Phase 1: Core Space Booking & Admin Notifications

### Tasks:
- [ ] Set up database tables for Users, Spaces, and Bookings with privacy settings
- [ ] Implement guest-friendly booking (no account required) and optional user registration
- [ ] Develop a public-facing live calendar component with privacy-aware display
- [ ] Create a booking form for guests/users to request a space with email/phone collection
- [ ] Build admin dashboard with real-time notifications for booking approvals
- [ ] Configure automated email notifications to alert administrators of new booking requests

### Acceptance Criteria:
- [ ] A guest can submit a booking request without creating an account
- [ ] Booking requests require admin approval before appearing on calendar
- [ ] The public calendar shows anonymous booking info (e.g., "2 people coworking")
- [ ] Administrators receive real-time notifications for new bookings
- [ ] Administrators can log in and approve/reject booking requests quickly

---

## Phase 2: Booking Management & User Dashboards

### Tasks:
- [ ] Add a 'status' field (e.g., pending, approved, rejected) to the Bookings table
- [ ] Implement functionality in the admin dashboard for staff to approve or reject booking requests
- [ ] Create a personal dashboard for users to view the status and history of their own bookings
- [ ] Set up automated email notifications to inform users when their booking status is updated
- [ ] Update the public calendar to only show 'approved' bookings as unavailable slots

### Acceptance Criteria:
- [ ] An administrator can change a booking's status from 'pending' to 'approved' or 'rejected'
- [ ] When a booking's status is changed, the user who made the booking receives an email notification
- [ ] A logged-in user can view a list of their past and upcoming bookings on their personal dashboard
- [ ] Rejected or pending booking requests do not block out time on the public-facing calendar

---

## Phase 3: Equipment Inventory & Reservation

### Tasks:
- [ ] Create new database tables for Equipment inventory and Equipment reservations
- [ ] Develop an admin interface for managing the equipment inventory (add, edit, set availability)
- [ ] Build a public page for users to browse available equipment
- [ ] Implement functionality for users to reserve equipment for specific time slots, checking for availability
- [ ] Update the admin dashboard to include a section for managing equipment reservations
- [ ] Allow users to add equipment reservations to a space booking in a single workflow

### Acceptance Criteria:
- [ ] Administrators can successfully add and manage equipment in the inventory system
- [ ] Users can view a catalog of rentable equipment and see its availability
- [ ] A user can reserve a piece of equipment for a specific date and time
- [ ] The system prevents double-booking of any single piece of equipment
- [ ] Admins can view and manage all equipment reservations from their dashboard

---

## Phase 4: Event Attendance System

### Tasks:
- [ ] Create database tables for Events and Event Attendance with promotional material support
- [ ] Implement event creation and management interface with pubmat uploads for administrators
- [ ] Build public event listing page with beautiful event cards and registration info
- [ ] Develop QR code generation system for each event
- [ ] Create check-in flow supporting both authenticated users and guests
- [ ] Implement real-time attendance tracking with capacity management
- [ ] Add attendance validation to prevent duplicates (with admin override)
- [ ] Build attendance export functionality for event reports
- [ ] Set up email confirmations for successful check-ins
- [ ] Create admin tools for manual check-ins and attendance management

### Acceptance Criteria:
- [ ] Administrators can create events with capacity limits and upload promotional materials
- [ ] Each event generates a unique QR code for check-in
- [ ] Users can check in via QR code in under 10 seconds
- [ ] Guests can check in without creating an account by providing name, email, and phone
- [ ] The system prevents duplicate check-ins with admin override capability
- [ ] Real-time attendance count is visible on event pages
- [ ] Administrators can export attendance data in CSV format
- [ ] Check-in confirmations are sent via email
- [ ] Events can display pubmats (promotional materials) on public pages
