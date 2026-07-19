import { useState } from 'react';
import { X, User, Briefcase, FileText, Star, ArrowUpDown, Image, Upload, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
  phone: string | null;
  email: string | null;
}

interface TeamMemberModalProps {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TeamMemberModal({ member, onClose, onSaved }: TeamMemberModalProps): JSX.Element {
  const isEditing = !!member;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: member?.name ?? '',
    designations: member?.designations ?? [{ position: '', department: '' }],
    bio: member?.bio ?? '',
    image_url: member?.image_url ?? '',
    is_featured: member?.is_featured ?? false,
    sort_order: member?.sort_order ?? 0,
    phone: member?.phone ?? '',
    email: member?.email ?? '',
  });

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addDesignation = (): void => {
    setForm(prev => ({
      ...prev,
      designations: [...prev.designations, { position: '', department: '' }]
    }));
  };

  const removeDesignation = (index: number): void => {
    setForm(prev => ({
      ...prev,
      designations: prev.designations.filter((_, i) => i !== index)
    }));
  };

  const updateDesignation = (index: number, field: keyof Designation, value: string): void => {
    setForm(prev => ({
      ...prev,
      designations: prev.designations.map((des, i) => 
        i === index ? { ...des, [field]: value } : des
      )
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `team/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('hub-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('hub-assets')
        .getPublicUrl(filePath);

      updateField('image_url', publicUrl);
      toast.success('Photo uploaded successfully!');
    } catch (err: unknown) {
      console.error('Error uploading photo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photo';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.designations.length === 0 || !form.designations.some(d => d.position.trim())) {
      toast.error('At least one position is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        designations: form.designations
          .filter(d => d.position.trim())
          .map(d => ({
            position: d.position.trim(),
            department: d.department?.trim() || undefined
          })),
        bio: form.bio.trim() || null,
        image_url: form.image_url.trim() || null,
        is_featured: form.is_featured,
        sort_order: form.sort_order,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      };

      if (isEditing && member) {
        const { error } = await supabase
          .from('hub_team')
          .update(payload)
          .eq('id', member.id);
        if (error) throw error;
        toast.success('Team member updated');
      } else {
        const { error } = await supabase
          .from('hub_team')
          .insert(payload);
        if (error) throw error;
        toast.success('Team member added');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving team member:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save team member';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline w-4 h-4 mr-1" />
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Jhonny Paul H. Lagura"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            />
          </div>

          {/* Designations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                <Briefcase className="inline w-4 h-4 mr-1" />
                Positions & Organizations <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addDesignation}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Another
              </button>
            </div>
            <div className="space-y-3">
              {form.designations.map((des, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={des.position}
                        onChange={(e) => updateDesignation(index, 'position', e.target.value)}
                        placeholder="Position (e.g., Head, Manager, Consultant)"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      />
                      <input
                        type="text"
                        value={des.department || ''}
                        onChange={(e) => updateDesignation(index, 'department', e.target.value)}
                        placeholder="Department/Organization (optional)"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    {form.designations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDesignation(index)}
                        className="mt-1 p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Add all positions this person holds across different organizations.</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline w-4 h-4 mr-1" />
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              rows={4}
              placeholder="A short description about this team member..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Optional. 2-3 sentences recommended.</p>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="0975 670 6143"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Optional. Displayed on About Us page.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="cdiisiligan@gmail.com"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Optional. Displayed on About Us page.</p>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image className="inline w-4 h-4 mr-1" />
              Team Member Photo
            </label>
            
            <div className="space-y-3">
              {/* File Upload Button */}
              <div>
                <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">Max 2MB. JPG, PNG, or WebP.</p>
              </div>

              {/* OR divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">or paste URL</span>
                </div>
              </div>

              {/* URL Input */}
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => updateField('image_url', e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />

              {/* Preview */}
              {form.image_url && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Featured & Sort Order Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Featured Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => updateField('is_featured', e.target.checked)}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">Featured Member</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Display at top with larger card</p>
                </div>
              </label>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ArrowUpDown className="inline w-4 h-4 mr-1" />
                Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 0)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
