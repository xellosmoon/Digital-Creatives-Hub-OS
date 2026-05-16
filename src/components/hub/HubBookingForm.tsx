import { useState, useEffect } from 'react';
import { Mail, Phone, User, Clock, Calendar, Info, Package, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { calculatePackagePrice, formatPeso } from '../../lib/hubPricingEngine';
import { calculateTotalRate, formatPeso as formatPesoGadgets } from '../../lib/pricingEngine';
import type { RentalPackage, HubPriceEstimate } from '../../types/hub';
import type { Asset, Item, PricingTier, AssetAvailability } from '../../types/gadgets';
import { BUNDLE_SLUGS } from '../../types/hub';

interface HubBookingFormProps {
  selectedPackage: RentalPackage;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function HubBookingForm({
  selectedPackage,
  onSuccess,
  onCancel,
}: HubBookingFormProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<number | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<HubPriceEstimate | null>(null);
  const [assets, setAssets] = useState<AssetAvailability[]>([]);
  const [allPricing, setAllPricing] = useState<PricingTier[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Asset[]>([]);
  const [equipmentTotal, setEquipmentTotal] = useState(0);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    bookingDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    purpose: '',
    notes: '',
  });

  const isBundle = BUNDLE_SLUGS.includes(selectedPackage.slug);
  const isDaily = selectedPackage.billing_mode === 'daily';

  useEffect(() => {
    if (formData.bookingDate) {
      fetchAvailableSeats(formData.bookingDate);
    }
  }, [formData.bookingDate]);

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    recalculatePrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startTime, formData.endTime, formData.bookingDate, selectedPackage, selectedEquipment]);

  const fetchAvailableSeats = async (date: string): Promise<void> => {
    try {
      const { data, error } = await supabase.rpc('get_available_seats', {
        target_date: date,
      });
      if (!error) {
        setAvailableSeats(data);
      }
    } catch (err) {
      console.error('Error fetching seats:', err);
    }
  };

  const fetchEquipment = async (): Promise<void> => {
    try {
      const [assetsRes, itemsRes, pricingRes] = await Promise.all([
        supabase.from('assets').select('*').eq('is_active', true).order('name'),
        supabase.from('items').select('*'),
        supabase.from('pricing_config').select('*'),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (pricingRes.error) throw pricingRes.error;

      const assetList = (assetsRes.data ?? []) as Asset[];
      const itemList = (itemsRes.data ?? []) as Item[];
      const pricingList = (pricingRes.data ?? []) as PricingTier[];

      setAllItems(itemList);
      setAllPricing(pricingList);

      const avail: AssetAvailability[] = assetList.map((asset) => {
        const items = itemList.filter((i) => i.asset_id === asset.id);
        return {
          asset,
          totalItems: items.length,
          availableItems: items.filter((i) => i.status === 'available').length,
          borrowedItems: items.filter((i) => i.status === 'borrowed').length,
          maintenanceItems: items.filter((i) => i.status === 'maintenance').length,
          brokenItems: items.filter((i) => i.status === 'broken').length,
        };
      });

      setAssets(avail.filter((a) => a.availableItems > 0));
    } catch (err) {
      console.error('Failed to load equipment', err);
    }
  };

  const recalculatePrice = (): void => {
    const startISO = `${formData.bookingDate}T${formData.startTime}:00`;
    const endISO = `${formData.bookingDate}T${formData.endTime}:00`;
    const estimate = calculatePackagePrice(selectedPackage, startISO, endISO);
    setPriceEstimate(estimate);

    // Calculate equipment total
    let equipmentTotal = 0;
    selectedEquipment.forEach((asset) => {
      const assetPricing = allPricing.filter((p) => p.asset_id === asset.id);
      if (assetPricing.length > 0) {
        const priceEstimate = calculateTotalRate(assetPricing, asset, 'inside', startISO, endISO);
        if (priceEstimate) {
          equipmentTotal += priceEstimate.totalPrice;
        }
      }
    });
    setEquipmentTotal(equipmentTotal);
  };

  const handleAddEquipment = (asset: Asset): void => {
    if (!selectedEquipment.find((e) => e.id === asset.id)) {
      setSelectedEquipment([...selectedEquipment, asset]);
    }
  };

  const handleRemoveEquipment = (assetId: string): void => {
    setSelectedEquipment(selectedEquipment.filter((e) => e.id !== assetId));
  };

  const checkEquipmentAvailability = async (assetId: string, startISO: string, endISO: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('borrowings')
        .select('id')
        .eq('asset_id', assetId)
        .in('status', ['approved', 'active'])
        .or(`start_time.lte.${endISO},end_time.gte.${startISO}`);

      if (error) throw error;
      return (data ?? []).length === 0;
    } catch (err) {
      console.error('Error checking equipment availability:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (availableSeats !== null && availableSeats < selectedPackage.seats_consumed) {
      toast.error(`Not enough seats available. Only ${availableSeats} seat(s) left.`);
      return;
    }

    setLoading(true);
    try {
      const startISO = new Date(`${formData.bookingDate}T${formData.startTime}:00`).toISOString();
      const endISO = new Date(`${formData.bookingDate}T${formData.endTime}:00`).toISOString();

      // Check equipment availability
      for (const asset of selectedEquipment) {
        const isAvailable = await checkEquipmentAvailability(asset.id, startISO, endISO);
        if (!isAvailable) {
          toast.error(`${asset.name} is not available during the selected time.`);
          setLoading(false);
          return;
        }
      }

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;

      // Create hub booking
      const { data: booking, error: bookingError } = await supabase.from('hub_bookings').insert({
        user_id: userId,
        package_id: selectedPackage.id,
        guest_name: formData.guestName,
        guest_email: formData.guestEmail,
        guest_phone: formData.guestPhone || null,
        booking_date: formData.bookingDate,
        start_time: startISO,
        end_time: endISO,
        seats_used: selectedPackage.seats_consumed,
        total_price: (priceEstimate?.totalPrice ?? 0) + equipmentTotal,
        status: 'pending',
        purpose: formData.purpose || null,
        notes: formData.notes || null,
      }).select().single();

      if (bookingError) throw bookingError;

      // Create borrowings for selected equipment
      if (selectedEquipment.length > 0 && booking) {
        for (const asset of selectedEquipment) {
          const assetPricing = allPricing.filter((p) => p.asset_id === asset.id);
          const priceEstimate = calculateTotalRate(assetPricing, asset, 'inside', startISO, endISO);
          
          // Find available item for this asset
          const availableItem = allItems.find(
            (i) => i.asset_id === asset.id && i.status === 'available'
          );

          if (availableItem && priceEstimate) {
            await supabase.from('borrowings').insert({
              user_id: userId,
              item_id: availableItem.id,
              asset_id: asset.id,
              booking_id: booking.id,
              location: 'inside',
              start_time: startISO,
              end_time: endISO,
              duration_hours: priceEstimate.durationHours,
              matched_tier_hours: priceEstimate.matchedTier.duration_hours,
              total_price: priceEstimate.totalPrice,
              status: 'pending',
              purpose: formData.purpose || null,
            });
          }
        }
      }

      toast.success('Booking request submitted! You will be notified when approved.');
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit booking';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Package Summary */}
      <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary-900">{selectedPackage.name}</h3>
            <p className="text-sm text-primary-700">{selectedPackage.description}</p>
          </div>
          <div className="text-right">
            {priceEstimate && (
              <>
                <p className="text-2xl font-bold text-primary-900">
                  {formatPeso((priceEstimate.totalPrice ?? 0) + equipmentTotal)}
                </p>
                <p className="text-xs text-primary-600">{priceEstimate.breakdown}</p>
                {equipmentTotal > 0 && (
                  <p className="text-xs text-primary-600">
                    + Equipment: {formatPesoGadgets(equipmentTotal)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seat availability warning */}
      {availableSeats !== null && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
          availableSeats < selectedPackage.seats_consumed
            ? 'bg-red-50 text-red-700'
            : availableSeats <= 5
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-green-50 text-green-700'
        }`}>
          <Info className="h-4 w-4" />
          {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available on {formData.bookingDate}
        </div>
      )}

      {/* Bundle notice */}
      {isBundle && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-purple-50 text-purple-700">
          <Info className="h-4 w-4" />
          This bundle reserves equipment from the shared gadget pool. Individual gadget rentals will be hidden to prevent double-booking.
        </div>
      )}

      {/* Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date *
          </label>
          <input
            type="date"
            required
            value={formData.bookingDate}
            onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        {!isDaily && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time *
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time *
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* Equipment Selection */}
      {!isBundle && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package className="inline h-4 w-4 mr-1" />
              Add Equipment (Optional)
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              onChange={(e) => {
                const asset = assets.find((a) => a.asset.id === e.target.value);
                if (asset) handleAddEquipment(asset.asset);
              }}
              value=""
            >
              <option value="">Select equipment to add...</option>
              {assets.map((avail) => (
                <option key={avail.asset.id} value={avail.asset.id}>
                  {avail.asset.name} ({avail.availableItems} available)
                </option>
              ))}
            </select>
          </div>

          {selectedEquipment.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected Equipment:</p>
              {selectedEquipment.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    <p className="text-xs text-gray-500">Inside Hub usage</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEquipment(asset.id)}
                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="text-right text-sm font-medium text-gray-700">
                Equipment Total: {formatPesoGadgets(equipmentTotal)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-4">
        <div>
          <label htmlFor="hubGuestName" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="hubGuestName"
              required
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Juan Dela Cruz"
            />
          </div>
        </div>

        <div>
          <label htmlFor="hubGuestEmail" className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="hubGuestEmail"
              required
              value={formData.guestEmail}
              onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="juan@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="hubGuestPhone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              id="hubGuestPhone"
              value={formData.guestPhone}
              onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="+63 917 123 4567"
            />
          </div>
        </div>

        <div>
          <label htmlFor="hubPurpose" className="block text-sm font-medium text-gray-700">
            Purpose
          </label>
          <textarea
            id="hubPurpose"
            rows={2}
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="What will you be working on?"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading || (availableSeats !== null && availableSeats < selectedPackage.seats_consumed)}
          className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : `Book – ${priceEstimate ? formatPeso((priceEstimate.totalPrice ?? 0) + equipmentTotal) : '...'}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
