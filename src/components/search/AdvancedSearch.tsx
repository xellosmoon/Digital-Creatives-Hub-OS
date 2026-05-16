import { useState } from 'react';
import { Search, Filter, Calendar, Users, DollarSign, X } from 'lucide-react';
import { format } from 'date-fns';

interface SearchFilters {
  query: string;
  spaceType: string;
  minCapacity: number;
  maxCapacity: number;
  maxPrice: number;
  date: string;
  amenities: string[];
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  spaceTypes: string[];
  availableAmenities: string[];
}

export default function AdvancedSearch({ onSearch, spaceTypes, availableAmenities }: AdvancedSearchProps): JSX.Element {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    spaceType: '',
    minCapacity: 0,
    maxCapacity: 100,
    maxPrice: 5000,
    date: format(new Date(), 'yyyy-MM-dd'),
    amenities: []
  });

  const handleSearch = (): void => {
    onSearch(filters);
  };

  const resetFilters = (): void => {
    setFilters({
      query: '',
      spaceType: '',
      minCapacity: 0,
      maxCapacity: 100,
      maxPrice: 5000,
      date: format(new Date(), 'yyyy-MM-dd'),
      amenities: []
    });
    onSearch({
      query: '',
      spaceType: '',
      minCapacity: 0,
      maxCapacity: 100,
      maxPrice: 5000,
      date: format(new Date(), 'yyyy-MM-dd'),
      amenities: []
    });
  };

  const toggleAmenity = (amenity: string): void => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      {/* Basic Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search spaces by name or location..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
        </button>
        <button
          onClick={handleSearch}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Space Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Space Type
              </label>
              <select
                value={filters.spaceType}
                onChange={(e) => setFilters({ ...filters, spaceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                {spaceTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Capacity Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Capacity
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.minCapacity || ''}
                  onChange={(e) => setFilters({ ...filters, minCapacity: parseInt(e.target.value) || 0 })}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.maxCapacity || ''}
                  onChange={(e) => setFilters({ ...filters, maxCapacity: parseInt(e.target.value) || 100 })}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Max Price per Hour
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">₱</span>
                <input
                  type="number"
                  min="0"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) || 5000 })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {availableAmenities.map(amenity => (
                <button
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.amenities.includes(amenity)
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  } border hover:bg-primary-50`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={resetFilters}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
            <div className="space-x-3">
              <button
                onClick={() => setShowAdvanced(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
