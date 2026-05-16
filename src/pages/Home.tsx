import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Calendar, Users, Zap, Shield, Building2, Clock, Star, ArrowRight, CheckCircle, 
  Sparkles, Coffee, Wifi, Monitor, Package, Camera, Smartphone, PenTool, Cpu, 
  Video, Navigation, Webcam, PartyPopper, ClipboardCheck, Briefcase, Lightbulb, 
  Layers, Presentation, Armchair
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { HubZone } from '../types/hub';

interface Equipment {
  id: string;
  name: string;
  category?: string;
  totalItems: number;
  availableItems: number;
}

interface Stats {
  totalSpaces: number;
  totalBookings: number;
  happyUsers: number;
}

interface Asset {
  id: string;
  name: string;
}

interface Item {
  id: string;
  asset_id: string;
  status: string;
}

const EQUIP_ICONS: Record<string, React.ElementType> = {
  interactive_display: Monitor,
  drawing_tablet: PenTool,
  computer: Cpu,
  action_camera: Video,
  camera: Camera,
  smartphone: Smartphone,
  drone: Navigation,
  webcam: Webcam,
};

function OfferCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }): JSX.Element {
  return (
    <div className="group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#F59E0B]/20 transition-all duration-500">
      <div className="w-14 h-14 rounded-2xl bg-[#0C2340]/5 flex items-center justify-center mb-6 group-hover:bg-[#F59E0B]/10 transition-colors">
        <Icon className="w-7 h-7 text-[#0C2340] group-hover:text-[#F59E0B] transition-colors" />
      </div>
      <h3 className="text-xl font-bold text-[#0C2340] mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

export default function Home(): JSX.Element {
  const [zones, setZones] = useState<HubZone[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSpaces: 0, totalBookings: 0, happyUsers: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchZones(), fetchStats(), fetchEquipment()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchZones = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('hub_zones')
        .select('*')
        .eq('is_bookable', true)
        .order('name');
      if (error) throw error;
      setZones(data || []);
    } catch (err) {
      console.error('Error fetching zones:', err);
      setError('Failed to load zones');
    }
  };

  const fetchEquipment = async (): Promise<void> => {
    try {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (assetsError) throw assetsError;
      if (!assets) { setEquipment([]); return; }
      const { data: items, error: itemsError } = await supabase.from('items').select('id, asset_id, status');
      if (itemsError) throw itemsError;
      const itemList = items || [];
      const enriched = assets.map((a: Asset) => {
        const assetItems = itemList.filter((i: Item) => i.asset_id === a.id);
        return {
          ...a,
          totalItems: assetItems.length,
          availableItems: assetItems.filter((i: Item) => i.status === 'available').length,
        };
      });
      setEquipment(enriched);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to load equipment');
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const { count: spacesCount, error: spacesError } = await supabase
        .from('spaces')
        .select('*', { count: 'exact', head: true });
      if (spacesError) throw spacesError;

      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      if (bookingsError) throw bookingsError;

      setStats({
        totalSpaces: spacesCount || 0,
        totalBookings: bookingsCount || 0,
        happyUsers: Math.floor((bookingsCount || 0) * 0.95)
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F59E0B]/5 via-white to-[#0C2340]/5">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#0C2340] font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F59E0B]/5 via-white to-[#0C2340]/5">
        <div className="text-center p-8">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#0C2340] text-white rounded-lg hover:bg-[#0C2340]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/5 via-white to-[#0C2340]/5 -z-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-[#0C2340]/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-[#F59E0B]/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#F59E0B]/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                <Sparkles className="w-4 h-4 mr-2" />
                Creative As One, Iligan
              </span>
            </div>
            <h1 className="text-5xl font-extrabold text-[#0C2340] sm:text-6xl md:text-7xl mb-6">
              Digital Creatives Hub Iligan
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
              Your 24/7 innovation, collaboration, and co-working space designed to fuel imagination, spark ideas, and build community.
            </p>

            {/* Three-Track Action Layout */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Track 1: Immediate Attendance (Primary) */}
              <div className="flex flex-col items-center text-center">
                <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Walk-In Check-In</p>
                <Link
                  to="/check-in"
                  className="group relative inline-flex items-center justify-center w-full px-8 py-6 text-lg font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-200/50 transition-all duration-300 hover:scale-105 hover:shadow-emerald-300/60"
                >
                  <span className="relative z-10 flex items-center">
                    <ClipboardCheck className="mr-2 w-6 h-6" />
                    Check In to the Hub
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <p className="mt-3 text-sm text-gray-500">For visitors at the entrance</p>
              </div>

              {/* Track 2: Future Reservations (Secondary) */}
              <div className="flex flex-col items-center text-center">
                <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Advanced Booking</p>
                <Link
                  to="/bookings"
                  className="group relative inline-flex items-center justify-center w-full px-8 py-6 text-lg font-bold text-white bg-[#0C2340] rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <span className="relative z-10 flex items-center">
                    Book a Space Now
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0C2340] to-blue-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <p className="mt-3 text-sm text-gray-500">For members planning ahead</p>
              </div>

              {/* Track 3: Host an Event (New) */}
              <div className="flex flex-col items-center text-center">
                <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Event Hosting</p>
                <Link
                  to="/propose-event"
                  className="group relative inline-flex items-center justify-center w-full px-8 py-6 text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl overflow-hidden shadow-2xl shadow-orange-200/50 transition-all duration-300 hover:scale-105 hover:shadow-orange-300/60"
                >
                  <span className="relative z-10 flex items-center">
                    <PartyPopper className="mr-2 w-6 h-6" />
                    Host an Event with Us
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <p className="mt-3 text-sm text-gray-500">Bring workshops & meetups</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What We Offer Section */}
      <div className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0C2340] sm:text-4xl">What We Offer</h2>
            <div className="w-20 h-1.5 bg-[#F59E0B] mx-auto mt-4 rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <OfferCard icon={Clock} title="24/7 Operations" description="Work anytime, day or night, in a secure and inspired environment." />
            <OfferCard icon={Presentation} title="Meetings/Events Venue" description="Professional spaces perfect for workshops, seminars, and gatherings." />
            <OfferCard icon={Briefcase} title="Virtual Office Space" description="Establish your business presence with our professional mailing address." />
            <OfferCard icon={Zap} title="Fast Internet Speed" description="Blazing fast fiber internet to keep your creative workflow uninterrupted." />
            <OfferCard icon={Lightbulb} title="Innovation Hub" description="Access to tools and a community focused on groundbreaking ideas." />
            <OfferCard icon={Layers} title="Collaborative Space" description="Connect, share, and grow with a network of talented digital pros." />
            <OfferCard icon={Armchair} title="Co-working Space" description="Ergonomic and flexible workstations designed for productivity." />
            <OfferCard icon={Camera} title="Digital Gadgets & Media Gear" description="High-end equipment available for rent to level up your production." />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-[#F59E0B]/10 rounded-full group-hover:bg-[#F59E0B]/20 transition-colors">
                  <Building2 className="w-8 h-8 text-[#F59E0B]" />
                </div>
              </div>
              <div className="text-4xl font-bold text-[#0C2340]">{stats.totalSpaces}+</div>
              <div className="text-gray-600 mt-1">Creative Spaces</div>
            </div>
            <div className="group">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-[#0C2340]/10 rounded-full group-hover:bg-[#0C2340]/20 transition-colors">
                  <Users className="w-8 h-8 text-[#0C2340]" />
                </div>
              </div>
              <div className="text-4xl font-bold text-[#0C2340]">{stats.happyUsers}+</div>
              <div className="text-gray-600 mt-1">Happy Creatives</div>
            </div>
            <div className="group">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-[#F59E0B]/10 rounded-full group-hover:bg-[#F59E0B]/20 transition-colors">
                  <Star className="w-8 h-8 text-[#F59E0B]" />
                </div>
              </div>
              <div className="text-4xl font-bold text-[#0C2340]">4.9</div>
              <div className="text-gray-600 mt-1">Average Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Creatives Choose Us
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to focus on what matters most - your creative work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature Cards */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Booking</h3>
                <p className="text-gray-600">No account needed. Book your perfect space in under 2 minutes.</p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Premium Spaces</h3>
                <p className="text-gray-600">Studios, meeting rooms, and event spaces designed for creativity.</p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Fast Approval</h3>
                <p className="text-gray-600">Real-time notifications and quick booking confirmations.</p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Private</h3>
                <p className="text-gray-600">Your data is protected with enterprise-grade security.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Zones Preview */}
      {zones.length > 0 && (
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#0C2340] mb-4">Hub Zones</h2>
              <p className="text-xl text-gray-600">Explore our creative quadrants</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {zones.map((zone) => (
                <div key={zone.id} className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-primary-300" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{zone.label}</h3>
                    <p className="text-gray-600 mb-4">{zone.description || zone.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">{zone.seats} seats</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Borrow Gear Section */}
      {equipment.length > 0 && (
        <div className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <Package className="w-4 h-4 mr-1" />
                  Gadget Lending
                </span>
              </div>
              <h2 className="text-4xl font-bold text-[#0C2340] mb-4">Creative Gadgets</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Level up your workflow with pro gear available for instant checkout
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {equipment.slice(0, 8).map((item: Equipment) => {
                const Icon = item.category && EQUIP_ICONS[item.category] ? EQUIP_ICONS[item.category] : Package;
                const allOut = item.availableItems === 0;
                return (
                  <div key={item.id} className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-primary-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
                    <div className="p-6 relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                      <div className={`inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full mb-3 ${allOut ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        <span className="font-bold mr-1">{item.availableItems}</span> of {item.totalItems} available
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Link
                          to="/gadgets"
                          className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
                        >
                          {allOut ? 'View Details' : 'Borrow Now'}
                          <ArrowRight className="ml-1 w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/gadgets"
                className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors"
              >
                <Package className="mr-2 w-5 h-5" />
                Browse All Gadgets
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Amenities Section */}
      <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#0C2340] mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">All spaces come fully equipped with premium amenities</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">High-Speed WiFi</h3>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Free Coffee</h3>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Modern Equipment</h3>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Community Events</h3>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C2340] to-[#F59E0B]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join Our Creative Community Today
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Start booking amazing spaces and connect with fellow creatives
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/bookings"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary-600 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-xl"
            >
              <CheckCircle className="mr-2 w-5 h-5" />
              Start Booking Now
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors border-2 border-white/50"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
