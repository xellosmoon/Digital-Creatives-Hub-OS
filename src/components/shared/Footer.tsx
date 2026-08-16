import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Sparkles, Heart } from 'lucide-react';

const QUICK_LINKS = [
  { to: '/bookings', label: 'Book a Seat' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/gadgets', label: 'Gadgets' },
  { to: '/about', label: 'About Us' },
  { to: '/booking-lookup', label: 'Find Booking' },
  { to: '/check-in', label: 'Check In' },
] as const;

export default function Footer(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-[#0C2340] via-[#1e3a5f] to-[#0C2340] text-white mt-auto overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-300 dark:from-[#F59E0B] dark:via-orange-400 dark:to-[#F59E0B] bg-clip-text text-transparent drop-shadow-sm">
                Digital Creatives Hub
              </h2>
            </div>
            <p className="text-xs max-w-xs text-slate-400 leading-relaxed">
              A Shared Service Facility for Iligan&apos;s creative professionals.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Iligan City, Philippines</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 mb-3">
              Quick Links
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {QUICK_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="font-semibold tracking-wide text-slate-300 hover:text-white hover:-translate-y-0.5 transition-all duration-200"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-300 mb-3">
              Contact
            </h3>
            <div className="flex flex-col gap-2 text-xs">
              <a
                href="mailto:lunarbyteitsolutions@gmail.com"
                className="inline-flex items-center gap-1.5 font-medium text-slate-300 hover:text-white transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                lunarbyteitsolutions@gmail.com
              </a>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                <Phone className="w-3.5 h-3.5 text-purple-400" />
                +63 XXX XXX XXXX
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-slate-800/50 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px] text-slate-500">
          <p className="font-medium tracking-wide">© {year} Digital Creatives Hub Iligan. All rights reserved.</p>
          <p className="flex items-center gap-1.5 font-medium tracking-wide">
            Made with
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            by
            <a
              href="mailto:lunarbyteitsolutions@gmail.com"
              className="inline-flex items-center gap-1.5 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-300 hover:to-purple-300 transition-all"
            >
              <img
                src="/lunarbyte-logo.jpg"
                alt="LunarByte IT Solutions logo"
                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
              />
              LUNARBYTE IT Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
