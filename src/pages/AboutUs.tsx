import { useState, useEffect } from 'react';
import { Building2, MapPin, Calendar, Users, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

export default function AboutUs(): JSX.Element {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async (): Promise<void> => {
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

  const featuredMember = team.find(m => m.is_featured);
  const staffMembers = team.filter(m => !m.is_featured);

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/5 via-white to-[#0C2340]/5 -z-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-[#0C2340]/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-[#F59E0B]/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#F59E0B]/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              <Sparkles className="w-4 h-4 mr-2" />
              A Shared Service Facility (SSF) Project
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-[#0C2340] sm:text-6xl mb-6">
            Digital Creatives Hub Iligan
          </h1>
          <div className="w-20 h-1.5 bg-[#F59E0B] mx-auto rounded-full mb-8"></div>
        </div>

        {/* Story Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-3xl shadow-xl p-8 md:p-12">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Established on <span className="font-bold text-[#0C2340]">April 28, 2025</span>, in partnership with <span className="font-bold text-[#0C2340]">LGU-Iligan City</span>, the Digital Creatives Hub is an official Shared Service Facility located at the <span className="font-bold text-[#0C2340]">2nd Floor, Mejia Building, Brgy. Pala-o, Iligan City</span>.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Operating as a supportive, 24/7 collaborative workspace, the hub provides local talent and creative industries with premium workstations, meeting venues, makerspaces, and strategic mentorship to help them succeed in the digital global economy.
            </p>

            {/* Quick Facts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-[#F59E0B]/10 rounded-full">
                    <Calendar className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Established</div>
                <div className="text-xl font-bold text-[#0C2340] mt-1">April 28, 2025</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-[#0C2340]/10 rounded-full">
                    <Building2 className="w-6 h-6 text-[#0C2340]" />
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cooperator</div>
                <div className="text-xl font-bold text-[#0C2340] mt-1">LGU-Iligan City</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-[#F59E0B]/10 rounded-full">
                    <MapPin className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</div>
                <div className="text-xl font-bold text-[#0C2340] mt-1">Brgy. Pala-o</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#0C2340] mb-4">Our Team</h2>
            <div className="w-20 h-1.5 bg-[#F59E0B] mx-auto rounded-full"></div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
            </div>
          ) : (
            <>
              {/* Featured Member (Hub Consultant) */}
              {featuredMember && (
                <div className="max-w-3xl mx-auto mb-12">
                  <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-3xl shadow-xl p-8 md:p-10 text-center">
                    <div className="flex justify-center mb-6">
                      {featuredMember.image_url ? (
                        <img
                          src={featuredMember.image_url}
                          alt={featuredMember.name}
                          className="h-24 w-24 rounded-full object-cover shadow-lg border-4 border-white"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#0C2340] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                          {featuredMember.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-[#0C2340] mb-2">{featuredMember.name}</h3>
                    <div className="space-y-2 mb-4">
                      {featuredMember.designations.map((des, idx) => (
                        <div key={idx}>
                          <p className="text-lg font-semibold text-[#F59E0B]">{des.position}</p>
                          {des.department && (
                            <p className="text-sm text-gray-600">{des.department}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {featuredMember.bio && (
                      <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">{featuredMember.bio}</p>
                    )}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
                        <a href="mailto:cdiisiligan@gmail.com" className="hover:text-[#F59E0B] transition-colors">
                          cdiisiligan@gmail.com
                        </a>
                        <span className="hidden sm:inline">•</span>
                        <a href="tel:09756706143" className="hover:text-[#F59E0B] transition-colors">
                          0975 670 6143
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Grid */}
              {staffMembers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staffMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white/70 backdrop-blur-md border border-white/40 rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="flex justify-center mb-4">
                        {member.image_url ? (
                          <img
                            src={member.image_url}
                            alt={member.name}
                            className="h-16 w-16 rounded-full object-cover shadow-md border-2 border-white"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#0C2340] to-[#F59E0B] flex items-center justify-center text-white text-xl font-bold shadow-md">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-[#0C2340] text-center mb-2">{member.name}</h3>
                      <div className="space-y-1 mb-3">
                        {member.designations.map((des, idx) => (
                          <div key={idx}>
                            <p className="text-sm font-semibold text-[#F59E0B] text-center">{des.position}</p>
                            {des.department && (
                              <p className="text-xs text-gray-600 text-center">{des.department}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      {member.bio && (
                        <p className="text-sm text-gray-600 text-center leading-relaxed">{member.bio}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {team.length === 0 && (
                <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No team members found</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
