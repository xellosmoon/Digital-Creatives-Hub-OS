import { useEffect, useState } from 'react';
import { Users, Building2, Calendar, TrendingUp, Clock, Award, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface HubAnalytics {
  totalVisitors: number;
  uniqueOrganizations: number;
  mostActivePCIDA: string;
  busiestDay: string;
  averageVisitDuration: string;
  topOrganizations: { name: string; count: number }[];
  dailyVisitors: { date: string; count: number }[];
  pcidaBreakdown: { domain: string; count: number }[];
  purposeBreakdown: { purpose: string; count: number }[];
}

export default function AdminStats(): JSX.Element {
  const [analytics, setAnalytics] = useState<HubAnalytics>({
    totalVisitors: 0,
    uniqueOrganizations: 0,
    mostActivePCIDA: '-',
    busiestDay: '-',
    averageVisitDuration: '-',
    topOrganizations: [],
    dailyVisitors: [],
    pcidaBreakdown: [],
    purposeBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async (): Promise<void> => {
    try {
      // Fetch all attendance records
      const { data: attendance, error } = await supabase
        .from('hub_attendance')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      if (!attendance || attendance.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate analytics
      const totalVisitors = attendance.length;
      
      // Unique organizations
      const orgSet = new Set<string>();
      attendance.forEach((a: Record<string, unknown>) => {
        if (a.organization && typeof a.organization === 'string' && a.organization.trim()) {
          orgSet.add(a.organization.trim());
        }
      });
      const uniqueOrganizations = orgSet.size;

      // PCIDA breakdown
      const pcidaCounts: Record<string, number> = {};
      attendance.forEach((a: Record<string, unknown>) => {
        const domain = a.creative_domain as string;
        if (domain && typeof domain === 'string' && domain.trim()) {
          pcidaCounts[domain.trim()] = (pcidaCounts[domain.trim()] || 0) + 1;
        }
      });
      const pcidaBreakdown = Object.entries(pcidaCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Most active PCIDA domain
      const mostActivePCIDA = pcidaBreakdown.length > 0 ? pcidaBreakdown[0].domain : '-';

      // Purpose breakdown
      const purposeCounts: Record<string, number> = {};
      attendance.forEach((a: Record<string, unknown>) => {
        const purpose = a.purpose as string;
        if (purpose && typeof purpose === 'string' && purpose.trim()) {
          purposeCounts[purpose.trim()] = (purposeCounts[purpose.trim()] || 0) + 1;
        }
      });
      const purposeBreakdown = Object.entries(purposeCounts)
        .map(([purpose, count]) => ({ purpose, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily visitors (last 7 days)
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = format(new Date(Date.now() - i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        dailyMap[date] = 0;
      }
      attendance.forEach((a: Record<string, unknown>) => {
        const checkIn = a.check_in_time as string;
        if (checkIn) {
          const date = checkIn.split('T')[0];
          if (date in dailyMap) {
            dailyMap[date]++;
          }
        }
      });
      const dailyVisitors = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Busiest day
      const dayCounts: Record<string, number> = {};
      attendance.forEach((a: Record<string, unknown>) => {
        const checkIn = a.check_in_time as string;
        if (checkIn) {
          const date = new Date(checkIn);
          const dayName = format(date, 'EEEE');
          dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        }
      });
      const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

      // Top organizations
      const orgCounts: Record<string, number> = {};
      attendance.forEach((a: Record<string, unknown>) => {
        const org = a.organization as string;
        if (org && typeof org === 'string' && org.trim()) {
          orgCounts[org.trim()] = (orgCounts[org.trim()] || 0) + 1;
        }
      });
      const topOrganizations = Object.entries(orgCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Average visit duration
      let totalDuration = 0;
      let durationCount = 0;
      attendance.forEach((a: Record<string, unknown>) => {
        const checkIn = a.check_in_time as string;
        const checkOut = a.check_out_time as string;
        if (checkIn && checkOut) {
          const inTime = new Date(checkIn).getTime();
          const outTime = new Date(checkOut).getTime();
          const durationHours = (outTime - inTime) / (1000 * 60 * 60);
          totalDuration += durationHours;
          durationCount++;
        }
      });
      const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
      const averageVisitDuration = avgDuration > 0 ? `${avgDuration.toFixed(1)}h` : '-';

      setAnalytics({
        totalVisitors,
        uniqueOrganizations,
        mostActivePCIDA,
        busiestDay,
        averageVisitDuration,
        topOrganizations,
        dailyVisitors,
        pcidaBreakdown,
        purposeBreakdown,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const quickStats = [
    { title: 'Total Visitors', value: analytics.totalVisitors, icon: Users, color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { title: 'Organizations', value: analytics.uniqueOrganizations, icon: Building2, color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { title: 'Busiest Day', value: analytics.busiestDay, icon: Calendar, color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { title: 'Avg Duration', value: analytics.averageVisitDuration, icon: Clock, color: 'bg-gradient-to-br from-purple-500 to-pink-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2.5 rounded-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout for Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Organizations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-900">Top Organizations</h3>
          </div>
          {analytics.topOrganizations.length > 0 ? (
            <div className="space-y-2">
              {analytics.topOrganizations.slice(0, 5).map((org, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-2">{org.name}</span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {org.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          )}
        </div>

        {/* PCIDA Domains */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-bold text-gray-900">Top Creative Domains</h3>
          </div>
          {analytics.pcidaBreakdown.length > 0 ? (
            <div className="space-y-2">
              {analytics.pcidaBreakdown.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-2">{item.domain}</span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          )}
        </div>

        {/* Purpose Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-rose-500" />
            <h3 className="text-sm font-bold text-gray-900">Visit Purposes</h3>
          </div>
          {analytics.purposeBreakdown.length > 0 ? (
            <div className="space-y-2">
              {analytics.purposeBreakdown.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-2">{item.purpose}</span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          )}
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            <h3 className="text-sm font-bold text-gray-900">Last 7 Days</h3>
          </div>
          {analytics.dailyVisitors.length > 0 ? (
            <div className="flex items-end justify-between gap-1 h-20">
              {analytics.dailyVisitors.map((day, index) => {
                const maxCount = Math.max(...analytics.dailyVisitors.map(d => d.count), 1);
                const height = day.count > 0 ? Math.max((day.count / maxCount) * 100, 20) : 20;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-gray-600">{day.count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-gray-400">
                      {format(new Date(day.date), 'EEE')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
