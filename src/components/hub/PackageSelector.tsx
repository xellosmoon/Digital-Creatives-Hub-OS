import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Calendar, Tag, AlertCircle, CheckCircle, Star, Package } from 'lucide-react';
import type { RentalPackage, PackageRequiredAsset } from '../../types/hub';
import { formatPeso } from '../../lib/pricingEngine';

interface PackageSelectorProps {
  onSelect: (pkg: RentalPackage) => void;
  isVerifiedStudent?: boolean;
  selectedDate?: string;
}

interface PackageWithAvailability extends RentalPackage {
  bundleAvailable: boolean;
  requiredAssets: PackageRequiredAsset[];
}

export default function PackageSelector({
  onSelect,
  isVerifiedStudent = false,
  selectedDate,
}: PackageSelectorProps): JSX.Element {
  const [packages, setPackages] = useState<PackageWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data: pkgs, error } = await supabase
        .from('rental_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const { data: reqAssets } = await supabase
        .from('package_required_assets')
        .select('*');

      const enriched: PackageWithAvailability[] = await Promise.all(
        (pkgs || []).map(async (pkg: RentalPackage) => {
          const assets = (reqAssets || []).filter(
            (a: PackageRequiredAsset) => a.package_id === pkg.id
          );
          let bundleAvailable = true;

          if (pkg.is_bundle) {
            const { data, error: rpcError } = await supabase.rpc(
              'check_bundle_availability',
              { p_package_id: pkg.id }
            );
            if (!rpcError && data === false) {
              bundleAvailable = false;
            }
          }

          return { ...pkg, requiredAssets: assets, bundleAvailable };
        })
      );

      setPackages(enriched);
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const isWeekend = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const getDisabledReason = (pkg: PackageWithAvailability): string | null => {
    if (pkg.requires_student_flag && !isVerifiedStudent) {
      return 'Requires verified student status';
    }
    if (pkg.weekend_only && selectedDate && !isWeekend(selectedDate)) {
      return 'Available on weekends only (Sat–Sun)';
    }
    if (pkg.is_bundle && !pkg.bundleAvailable) {
      return 'Required equipment is currently unavailable';
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-900">Select a Package</h3>
        <p className="text-sm text-gray-500">Choose the plan that fits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const disabledReason = getDisabledReason(pkg);
          const isDisabled = !!disabledReason;

          return (
            <button
              key={pkg.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(pkg)}
              className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                isDisabled
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-200 bg-white hover:border-primary-500 hover:shadow-md cursor-pointer'
              }`}
            >
              {pkg.is_bundle && (
                <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <Package className="h-3 w-3 mr-1" />
                  Bundle
                </span>
              )}

              {pkg.requires_student_flag && (
                <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Star className="h-3 w-3 mr-1" />
                  Student
                </span>
              )}

              <h4 className="text-base font-semibold text-gray-900 pr-16">{pkg.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>

              {/* Pricing */}
              <div className="mt-3 space-y-1">
                {pkg.hourly_rate != null && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                    {formatPeso(pkg.hourly_rate)} / hour
                  </div>
                )}
                {pkg.daily_rate != null && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                    {formatPeso(pkg.daily_rate)} / day
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pkg.weekend_only && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    <Tag className="h-3 w-3 mr-1" />
                    Weekends Only
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {pkg.seats_consumed} seat{pkg.seats_consumed > 1 ? 's' : ''}
                </span>
              </div>

              {/* Required assets for bundles */}
              {pkg.is_bundle && pkg.requiredAssets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Includes:</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.requiredAssets.map((a) => (
                      <span key={a.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {a.quantity_needed}× {a.asset_category.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Disabled reason */}
              {isDisabled && disabledReason && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {disabledReason}
                </div>
              )}

              {!isDisabled && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Available
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
