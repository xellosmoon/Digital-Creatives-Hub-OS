import { useState, useEffect } from 'react';
import { Users, AlertTriangle, CheckCircle, XCircle, Monitor, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import type { HubCapacityConfig, DailyOccupancy, HubZone } from '../../types/hub';

interface HubLiveStatusData {
  totalSeats: number;
  adjustment: number;
  booked: number;
  available: number;
  workshopQ2: boolean;
  workshopQ4: boolean;
  zones: HubZone[];
}

export default function HubLiveStatus() {
  const [status, setStatus] = useState<HubLiveStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [configRes, occupancyRes, zonesRes] = await Promise.all([
        supabase.from('hub_capacity_config').select('*').limit(1).single(),
        supabase.from('daily_occupancy').select('*').eq('occupancy_date', today).maybeSingle(),
        supabase.from('hub_zones').select('*').order('name'),
      ]);

      const config: HubCapacityConfig | null = configRes.data;
      const occupancy: DailyOccupancy | null = occupancyRes.data;
      const zones: HubZone[] = zonesRes.data || [];

      const totalSeats = config?.total_seats ?? 28;
      const adjustment = config?.manual_adjustment ?? 0;
      const booked = occupancy?.total_booked_seats ?? 0;
      const workshopQ2 = occupancy?.workshop_block_q2 ?? false;
      const workshopQ4 = occupancy?.workshop_block_q4 ?? false;

      const isFullBlock = workshopQ2 && workshopQ4;
      const available = isFullBlock ? 0 : Math.max(0, totalSeats + adjustment - booked);

      setStatus({
        totalSeats,
        adjustment,
        booked,
        available,
        workshopQ2,
        workshopQ4,
        zones,
      });
    } catch (err) {
      console.error('Error fetching hub status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const pct = Math.round((status.available / Math.max(1, status.totalSeats + status.adjustment)) * 100);
  const isFullHub = status.workshopQ2 && status.workshopQ4;
  const barColor =
    isFullHub ? 'bg-red-500'
    : pct <= 20 ? 'bg-orange-500'
    : pct <= 50 ? 'bg-yellow-500'
    : 'bg-green-500';

  const statusIcon = isFullHub
    ? <XCircle className="h-8 w-8 text-red-500" />
    : pct <= 20
    ? <AlertTriangle className="h-8 w-8 text-orange-500" />
    : <CheckCircle className="h-8 w-8 text-green-500" />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Main Status */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hub Live Status</h3>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          {statusIcon}
        </div>

        {/* Big number */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">{status.available}</span>
          <span className="text-lg text-gray-500">of {status.totalSeats + status.adjustment} seats available</span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${barColor} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>

        {isFullHub && (
          <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm font-medium">
            <XCircle className="h-4 w-4" />
            Full Hub is reserved for a Workshop / Seminar today
          </div>
        )}

        {status.adjustment !== 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Admin adjustment: {status.adjustment > 0 ? '+' : ''}{status.adjustment} seats
          </p>
        )}
      </div>

      {/* Zones */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Zone Overview</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {status.zones.filter(z => z.is_bookable).map(zone => {
            const isBlocked =
              (zone.name === 'q2_tech' && status.workshopQ2) ||
              (zone.name === 'q4_creative' && status.workshopQ4);

            return (
              <div
                key={zone.id}
                className={`rounded-lg border px-4 py-3 ${
                  isBlocked
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {zone.name === 'q2_tech' ? (
                    <Monitor className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Palette className="h-4 w-4 text-purple-500" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{zone.label}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Users className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {zone.seats} seats
                    {isBlocked && (
                      <span className="ml-1 text-red-600 font-medium">– Workshop blocked</span>
                    )}
                  </span>
                </div>
                {zone.equipment_summary && (
                  <p className="mt-1 text-xs text-gray-400">{zone.equipment_summary}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
