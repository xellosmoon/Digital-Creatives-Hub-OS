import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Star, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import TeamMemberModal from '../components/admin/TeamMemberModal';

interface Designation {
  position: string;
  department?: string;
}

interface TeamMember {
  id: string;
  name: string;
  designations: Designation[];
  bio: string | null;
  image_url: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export default function TeamManagement(): JSX.Element {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    fetchTeam();

    // Real-time subscription
    const subscription = supabase
      .channel('team-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_team' }, () => {
        fetchTeam();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTeam = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_team')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTeam(data || []);
    } catch (err) {
      console.error('Error fetching team:', err);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (): void => {
    setSelectedMember(null);
    setShowModal(true);
  };

  const handleEdit = (member: TeamMember): void => {
    setSelectedMember(member);
    setShowModal(true);
  };

  const handleDelete = async (member: TeamMember): Promise<void> => {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('hub_team')
        .delete()
        .eq('id', member.id);

      if (error) throw error;
      toast.success('Team member deleted');
      fetchTeam();
    } catch (err: unknown) {
      console.error('Error deleting team member:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete team member';
      toast.error(errorMessage);
    }
  };

  const handleModalClose = (): void => {
    setShowModal(false);
    setSelectedMember(null);
  };

  const handleModalSaved = (): void => {
    fetchTeam();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="mt-1 text-gray-600">Manage team members displayed on the About Us page</p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Team List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : team.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No team members yet</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add your first team member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name & Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Star className="w-4 h-4 inline" />
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <ArrowUpDown className="w-4 h-4 inline" />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                        {member.designations.map((des, idx) => (
                          <div key={idx} className="mt-0.5">
                            <div className="text-sm text-[#F59E0B] font-medium">{des.position}</div>
                            {des.department && (
                              <div className="text-xs text-gray-500">{des.department}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-md truncate">
                      {member.bio || <span className="text-gray-400 italic">No bio</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {member.is_featured && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-mono text-gray-600">{member.sort_order}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TeamMemberModal
          member={selectedMember}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
