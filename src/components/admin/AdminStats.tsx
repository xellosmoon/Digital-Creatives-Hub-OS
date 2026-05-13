import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    rejectedBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: bookings, error } = await supabase
        .from('hub_bookings')
        .select('status');

      if (error) throw error;

      const stats = bookings?.reduce((acc, booking) => {
        acc.totalBookings++;
        if (booking.status === 'pending') acc.pendingBookings++;
        if (booking.status === 'approved') acc.approvedBookings++;
        if (booking.status === 'rejected') acc.rejectedBookings++;
        return acc;
      }, {
        totalBookings: 0,
        pendingBookings: 0,
        approvedBookings: 0,
        rejectedBookings: 0,
      });

      setStats(stats || {
        totalBookings: 0,
        pendingBookings: 0,
        approvedBookings: 0,
        rejectedBookings: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Approval',
      value: stats.pendingBookings,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Approved',
      value: stats.approvedBookings,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Rejected',
      value: stats.rejectedBookings,
      icon: XCircle,
      color: 'bg-red-500',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
