import { Link } from 'react-router-dom';
import { Calendar, Package, Info, Search, ClipboardCheck } from 'lucide-react';

const QUICK_LINKS = [
  { to: '/bookings', label: 'Book a Seat', icon: Calendar },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/gadgets', label: 'Gadgets', icon: Package },
  { to: '/about', label: 'About Us', icon: Info },
  { to: '/booking-lookup', label: 'Find Booking', icon: Search },
  { to: '/check-in', label: 'Check In', icon: ClipboardCheck },
] as const;

export default function Footer(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0C2340] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">
              Digital Creatives Hub Iligan
            </h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              A Shared Service Facility for Iligan&apos;s creative professionals — book seats,
              join events, and borrow equipment.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-4">
              Quick Links
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#F59E0B] transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-white/60">
            © {year} Digital Creatives Hub Iligan. All rights reserved.
          </p>
          <p className="text-xs text-white/60">
            Made by{' '}
            <a 
              href="mailto:lunarbyteitsolutions@gmail.com" 
              className="font-semibold text-[#F59E0B] tracking-wide hover:text-white transition-colors"
            >
              LUNARBYTE IT Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
