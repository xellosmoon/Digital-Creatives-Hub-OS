import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Calendar, Users, Zap, Shield, Building2, Clock, Star, ArrowRight, CheckCircle, Sparkles, Coffee, Wifi, Monitor, Package, Camera, Smartphone, PenTool, Cpu, Video, Navigation, Webcam, PartyPopper, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSpaces: 0, totalBookings: 0, happyUsers: 0 });

  const EQUIP_ICONS: Record<string, React.ElementType> = {
    interactive_display: Monitor, drawing_tablet: PenTool, computer: Cpu,
    action_camera: Video, camera: Camera, smartphone: Smartphone,
    drone: Navigation, webcam: Webcam,
  };

  useEffect(() => {
    fetchSpaces();
    fetchStats();
    fetchEquipment();
  }, []);

  const fetchSpaces = async () => {
    const { data } = await supabase
      .from('spaces')
      .select('*')
      .eq('is_active', true)
      .limit(3);
    setSpaces(data || []);
  };

  const fetchEquipment = async () => {
    try {
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (!assets) { setEquipment([]); return; }
      const { data: items } = await supabase.from('items').select('id, asset_id, status');
      const itemList = items || [];
      const enriched = assets.map((a: any) => {
        const assetItems = itemList.filter((i: any) => i.asset_id === a.id);
        return {
          ...a,
          totalItems: assetItems.length,
          availableItems: assetItems.filter((i: any) => i.status === 'available').length,
        };
      });
      setEquipment(enriched);
    } catch { setEquipment([]); }
  };

  const fetchStats = async () => {
    const { count: spacesCount } = await supabase
      .from('spaces')
      .select('*', { count: 'exact', head: true });
    
    const { count: bookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    
    setStats({
      totalSpaces: spacesCount || 0,
      totalBookings: bookingsCount || 0,
      happyUsers: Math.floor((bookingsCount || 0) * 0.95) // Simulated happy users
    });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50 -z-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                <CheckCircle className="w-4 h-4 mr-1" />
                Government-Ready Solution
              </span>
            </div>
            <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
              <span className="block">Creative</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
                Coworking
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
              Professional coworking spaces for government agencies, businesses, and creative professionals. 
              Book meeting rooms, workspaces, and event venues with ease.
            </p>
            {/* Check-In Banner */}
            <div className="mt-10 mb-6">
              <Link
                to="/check-in"
                className="group relative inline-flex items-center justify-center w-full sm:w-auto px-10 py-5 text-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-200/50 transition-all duration-300 hover:scale-105 hover:shadow-emerald-300/60"
              >
                <span className="relative z-10 flex items-center">
                  <ClipboardCheck className="mr-3 w-7 h-7" />
                  Check In to the Hub
                  <ArrowRight className="ml-3 w-6 h-6 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/bookings"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-600 rounded-full overflow-hidden shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center">
                  Book a Space Now
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link
                to="/propose-event"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full overflow-hidden shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center">
                  <PartyPopper className="mr-2 w-5 h-5" />
                  Propose an Event
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link
                to="/calendar"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white rounded-full shadow-lg border-2 border-gray-200 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary-300"
              >
                <Calendar className="mr-2 w-5 h-5" />
                View Calendar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary-100 rounded-full group-hover:bg-primary-200 transition-colors">
                  <Building2 className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <div className="text-4xl font-bold text-gray-900">{stats.totalSpaces}+</div>
              <div className="text-gray-600 mt-1">Creative Spaces</div>
            </div>
            <div className="group">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <div className="text-4xl font-bold text-gray-900">{stats.happyUsers}+</div>
              <div className="text-gray-600 mt-1">Happy Creatives</div>
            </div>
            <div className="group">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-pink-100 rounded-full group-hover:bg-pink-200 transition-colors">
                  <Star className="w-8 h-8 text-pink-600" />
                </div>
              </div>
              <div className="text-4xl font-bold text-gray-900">4.9</div>
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

      {/* Available Spaces Preview */}
      {spaces.length > 0 && (
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Spaces</h2>
              <p className="text-xl text-gray-600">Discover our most popular creative spaces</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {spaces.map((space) => (
                <div key={space.id} className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-primary-100 to-purple-100">
                    {space.image_url ? (
                      <img src={space.image_url} alt={space.name} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-primary-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{space.name}</h3>
                    <p className="text-gray-600 mb-4">{space.type}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">${space.hourly_rate}/hr</span>
                      <Link
                        to="/bookings"
                        className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Book Now
                        <ArrowRight className="ml-1 w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/bookings"
                className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-primary-600 bg-primary-50 rounded-full hover:bg-primary-100 transition-colors"
              >
                View All Spaces
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
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
                  Equipment Lending
                </span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Borrow Gear</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Professional cameras, drones, and creative tools available for checkout
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {equipment.slice(0, 8).map((item: any) => {
                const Icon = EQUIP_ICONS[item.category] ?? Package;
                const allOut = item.availableItems === 0;
                return (
                  <div key={item.id} className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-primary-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
                    <div className="p-6 relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                      <div className={`inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full mb-3 ${
                        allOut ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        <span className="font-bold mr-1">{item.availableItems}</span> of {item.totalItems} available
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Link
                          to="/inventory"
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
                to="/inventory"
                className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors"
              >
                <Package className="mr-2 w-5 h-5" />
                View All Equipment
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
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
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-purple-600"></div>
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
