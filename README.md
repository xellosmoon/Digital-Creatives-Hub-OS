# Creative Coworking

A professional workspace booking and management system built with React, TypeScript, and Supabase. Perfect for government agencies, businesses, and creative professionals.

## Features

### Core Features
- **Space Booking System** - Browse and book various spaces (studios, meeting rooms, coworking spaces)
- **Guest Booking** - No account required for booking requests
- **User Dashboard** - Manage bookings, view history, modify/cancel bookings
- **Admin Dashboard** - Approve/reject bookings, manage spaces, view analytics
- **Real-time Notifications** - Instant updates on booking status changes
- **Recurring Bookings** - Schedule regular bookings with ease

### Space Management
- **Space Administration** - Add, edit, delete, and manage space details
- **Availability Settings** - Configure weekly schedules and blackout dates
- **Pricing & Capacity** - Set hourly rates and capacity limits
- **Amenities Management** - List and manage space amenities

### Analytics & Reporting
- **Booking Analytics** - Track space utilization and booking trends
- **Revenue Tracking** - Monitor income from space bookings
- **CSV Export** - Export booking and analytics data
- **Visual Charts** - Interactive charts for data visualization

### Notifications & Communication
- **Email Notifications** - Automated emails for booking updates
- **Real-time Alerts** - In-app notification system
- **Notification Preferences
- **Booking Reminders** - Automated reminders before bookings

### Advanced Features
- **Advanced Search** - Filter spaces by type, capacity, price, and amenities
- **Payment Integration** - Placeholder for payment processing
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Role-based Access** - Different features for guests, users, and admins

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Query
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **Charts**: Recharts

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/digital-creatives-hub-os.git
   cd digital-creatives-hub-os
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the SQL commands from `supabase-schema.sql`
   - (Optional) Run `sample-data.sql` to add sample spaces

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/         # Reusable components
│   ├── admin/         # Admin-specific components
│   ├── auth/          # Authentication components
│   ├── booking/       # Booking-related components
│   ├── calendar/      # Calendar components
│   ├── notifications/ # Notification components
│   ├── payment/       # Payment components
│   ├── search/        # Search components
│   ├── settings/      # Settings components
│   └── shared/        # Shared/common components
├── lib/               # Utilities and services
├── pages/             # Page components
├── types/             # TypeScript type definitions
└── utils/             # Helper functions
```

## User Roles

### Guest Users
- Browse available spaces
- Submit booking requests
- Look up bookings by reference

### Registered Users
- All guest features
- View booking history
- Modify/cancel bookings
- Manage notification preferences
- Access user dashboard

### Admins
- All user features
- Approve/reject bookings
- Manage spaces
- View analytics
- Export data
- Access admin dashboard

## Getting Started

1. **As a Guest**
   - Click "Book a Space" on the homepage
   - Select a space, time, and provide contact details
   - Submit booking request

2. **As a User**
   - Register for an account
   - Access your dashboard to manage bookings
   - Set notification preferences

3. **As an Admin**
   - Contact system administrator for admin access
   - Access `/admin` for the admin dashboard
   - Manage spaces at `/admin/spaces`
   - View analytics at `/admin/analytics`

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

The app can be deployed to various platforms:

- **Netlify**: Use the `deploy_web_app` tool or manual deployment
- **Vercel**: Connect your GitHub repo
- **Custom Server**: Build and serve the `dist` folder

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React and Vite
- UI components styled with Tailwind CSS
- Database powered by Supabase
- Icons from Lucide React
