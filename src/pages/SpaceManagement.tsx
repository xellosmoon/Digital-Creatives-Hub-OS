import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, DollarSign, Users, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import SpaceForm from '../components/admin/SpaceForm';
import SpaceAvailability from '../components/admin/SpaceAvailability';

interface Space {
  id: string;
  name: string;
  type: string;
  capacity: number;
  hourly_rate: number;
  location?: string;
  amenities?: string[];
  description?: string;
  is_active: boolean;
  privacy_level: string;
  created_at: string;
}

export default function SpaceManagement() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [availabilitySpace, setAvailabilitySpace] = useState<Space | null>(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('name');

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpaceStatus = async (space: Space) => {
    try {
      const { error } = await supabase
        .from('spaces')
        .update({ is_active: !space.is_active })
        .eq('id', space.id);

      if (error) throw error;
      
      toast.success(`Space ${!space.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchSpaces();
    } catch (error) {
      console.error('Error toggling space status:', error);
      toast.error('Failed to update space status');
    }
  };

  const deleteSpace = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;
      
      toast.success('Space deleted successfully');
      fetchSpaces();
    } catch (error) {
      console.error('Error deleting space:', error);
      toast.error('Failed to delete space');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Space Management</h1>
            <p className="mt-2 text-gray-600">Manage your spaces, pricing, and availability</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Space
          </button>
        </div>
      </div>

      {/* Spaces Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : spaces.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No spaces</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new space.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Space
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <div key={space.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{space.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{space.type.replace('_', ' ')}</p>
                  </div>
                  <button
                    onClick={() => toggleSpaceStatus(space)}
                    className={`p-2 rounded-full ${
                      space.is_active 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {space.is_active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    ₱{space.hourly_rate}/hour
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Capacity: {space.capacity} people
                  </div>
                  {space.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {space.location}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    space.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {space.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {space.privacy_level === 'public' ? 'Public' : 
                     space.privacy_level === 'members_only' ? 'Members Only' : 
                     'Anonymous'}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setAvailabilitySpace(space)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Availability
                  </button>
                  <button
                    onClick={() => setEditingSpace(space)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteSpace(space.id)}
                    className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingSpace) && (
        <SpaceForm
          space={editingSpace}
          onClose={() => {
            setShowAddModal(false);
            setEditingSpace(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingSpace(null);
            fetchSpaces();
          }}
        />
      )}

      {/* Availability Modal */}
      {availabilitySpace && (
        <SpaceAvailability
          spaceId={availabilitySpace.id}
          spaceName={availabilitySpace.name}
          onClose={() => setAvailabilitySpace(null)}
        />
      )}
    </div>
  );
}
