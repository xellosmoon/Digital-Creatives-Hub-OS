import { Link } from 'react-router-dom';
import { Calendar, Package, Info, Search, ClipboardCheck, MapPin, Mail, Phone, Sparkles, Zap, Heart } from 'lucide-react';

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
    <footer className="relative bg-gradient-to-br from-[#0C2340] via-[#1e3a5f] to-[#0C2340] text-white mt-auto overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Digital Creatives Hub
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              A Shared Service Facility for Iligan&apos;s creative professionals — book seats,
              join events, and borrow equipment.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Iligan City, Philippines</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Links
            </h3>
            <ul className="space-y-3">
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex items-center gap-3 text-sm text-slate-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200"
                  >
                    <Icon className="w-4 h-4 text-blue-400" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-6 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact
            </h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 px-4 py-3 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all">
                <Mail className="w-5 h-5 text-blue-400" />
                <a href="mailto:lunarbyteitsolutions@gmail.com" className="hover:text-white transition-colors">
                  lunarbyteitsolutions@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 px-4 py-3 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all">
                <Phone className="w-5 h-5 text-purple-400" />
                <span>+63 XXX XXX XXXX</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-slate-400">
            © {year} Digital Creatives Hub Iligan. All rights reserved.
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            Made with{' '}
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            {' '}
            by{' '}
            <a 
              href="mailto:lunarbyteitsolutions@gmail.com" 
              className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-all"
            >
              LUNARBYTE IT Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
