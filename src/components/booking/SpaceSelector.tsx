import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Users, Clock } from 'lucide-react';

interface Space {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  image_url?: string;
  location?: string;
  capacity: number;
  hourly_rate: number;
  amenities?: string[];
}

interface SpaceSelectorProps {
  onSelect: (space: Space) => void;
}

export default function SpaceSelector({ onSelect }: SpaceSelectorProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (selectedType === 'all') {
      setFilteredSpaces(spaces);
    } else {
      setFilteredSpaces(spaces.filter(space => space.type === selectedType));
    }
  }, [selectedType, spaces]);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const spacesData = data || [];
      setSpaces(spacesData);
      
      // Extract unique space types
      const types = [...new Set(spacesData.map(space => space.type))].filter(Boolean);
      setSpaceTypes(types);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Space Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Space types">
          <button
            onClick={() => setSelectedType('all')}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              ${selectedType === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            All Spaces
          </button>
          {spaceTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                ${selectedType === type
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Space Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredSpaces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No spaces available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpaces.map((space) => (
            <div
              key={space.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelect(space)}
            >
              {space.image_url && (
                <img
                  src={space.image_url}
                  alt={space.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">{space.name}</h3>
                
                <div className="mt-2 space-y-1">
                  {space.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {space.location}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    Capacity: {space.capacity} people
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    ₱{space.hourly_rate}/hour
                  </div>
                </div>

                {space.amenities && space.amenities.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                      {space.amenities.slice(0, 3).map((amenity, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {amenity}
                        </span>
                      ))}
                      {space.amenities.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{space.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <button className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors">
                  Select Space
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
