import { useState, useEffect } from 'react';
import { Plus, RefreshCw, ArrowLeft, Trash2, Edit2, Image as ImageIcon, Upload, X, Check, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface GalleryImage {
  id: string;
  title: string;
  category: string;
  badge: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  title: string;
  category: string;
  badge: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  display_order: number;
}

/**
 * Admin page for managing homepage gallery images (CRUD).
 * Accessible at /admin/gallery — protected by the ProtectedRoute wrapper.
 */
export default function GalleryManagement(): JSX.Element {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    badge: '',
    cloudinary_public_id: '',
    cloudinary_url: '',
    display_order: 0,
  });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_gallery')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setImages((data as GalleryImage[]) ?? []);
    } catch (err) {
      console.error('Error fetching gallery images:', err);
      toast.error('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (): void => {
    setEditingImage(null);
    setFormData({
      title: '',
      category: '',
      badge: '',
      cloudinary_public_id: '',
      cloudinary_url: '',
      display_order: images.length,
    });
    setShowModal(true);
  };

  const handleEdit = (image: GalleryImage): void => {
    setEditingImage(image);
    setFormData({
      title: image.title,
      category: image.category,
      badge: image.badge,
      cloudinary_public_id: image.cloudinary_public_id,
      cloudinary_url: image.cloudinary_url,
      display_order: image.display_order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const { error } = await supabase
        .from('hub_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Image deleted successfully');
      fetchImages();
    } catch (err) {
      console.error('Error deleting image:', err);
      toast.error('Failed to delete image');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('hub_gallery')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Image ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchImages();
    } catch (err) {
      console.error('Error toggling image status:', err);
      toast.error('Failed to update image status');
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setUploading(true);

    try {
      if (editingImage) {
        // Update existing
        const { error } = await supabase
          .from('hub_gallery')
          .update({
            title: formData.title,
            category: formData.category,
            badge: formData.badge,
            cloudinary_public_id: formData.cloudinary_public_id,
            cloudinary_url: formData.cloudinary_url,
            display_order: formData.display_order,
          })
          .eq('id', editingImage.id);

        if (error) throw error;
        toast.success('Image updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('hub_gallery')
          .insert({
            title: formData.title,
            category: formData.category,
            badge: formData.badge,
            cloudinary_public_id: formData.cloudinary_public_id,
            cloudinary_url: formData.cloudinary_url,
            display_order: formData.display_order,
            is_active: true,
          });

        if (error) throw error;
        toast.success('Image added successfully');
      }

      setShowModal(false);
      fetchImages();
    } catch (err) {
      console.error('Error saving image:', err);
      toast.error('Failed to save image');
    } finally {
      setUploading(false);
    }
  };

  const handleCloudinaryUpload = async (file: File): Promise<void> => {
    setUploading(true);
    try {
      // For now, use a simple file reader to get a preview URL
      // In production, integrate with Cloudinary upload API
      const reader = new FileReader();
      reader.onloadend = () => {
        const mockPublicId = `gallery_${Date.now()}`;
        const mockUrl = reader.result as string;
        
        setFormData({
          ...formData,
          cloudinary_public_id: mockPublicId,
          cloudinary_url: mockUrl,
        });
        
        toast.success('Image uploaded (demo mode)');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#0C2340] dark:text-white">Gallery Management</h1>
              <p className="text-gray-600 mt-1 dark:text-gray-400">Manage homepage gallery images</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchImages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0C2340] text-white hover:bg-[#0C2340]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Image
            </button>
          </div>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2340] dark:border-primary-400"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2 dark:text-gray-200">No images yet</h3>
            <p className="text-gray-500 mb-4 dark:text-gray-400">Add your first gallery image to get started</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0C2340] text-white hover:bg-[#0C2340]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Image
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all dark:bg-slate-800 ${
                  image.is_active ? 'border-gray-200 shadow-md dark:border-slate-700' : 'border-gray-300 opacity-60 dark:border-slate-600'
                }`}
              >
                <div className="aspect-video bg-gray-100 relative dark:bg-slate-900">
                  <img
                    src={image.cloudinary_url}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  {!image.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold">Inactive</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate dark:text-white">{image.title}</h3>
                  <p className="text-sm text-gray-600 mb-2 dark:text-gray-400">{image.category}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full dark:bg-amber-900/30 dark:text-amber-300">
                      {image.badge}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Order: {image.display_order}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(image)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(image.id, image.is_active)}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                        image.is_active
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300'
                      }`}
                    >
                      {image.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {image.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors text-sm dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto dark:bg-slate-800">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0C2340] dark:text-white">
                  {editingImage ? 'Edit Image' : 'Add New Image'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="Coworking">Coworking</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Meetings">Meetings</option>
                  <option value="Media">Media</option>
                  <option value="Workshops">Workshops</option>
                  <option value="Community">Community</option>
                  <option value="Studio">Studio</option>
                  <option value="Events">Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Badge Text (with emoji) *
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g., ☕ Coworking Lounge"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Display Order *
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Lower numbers appear first</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Cloudinary Public ID *
                </label>
                <input
                  type="text"
                  value={formData.cloudinary_public_id}
                  onChange={(e) => setFormData({ ...formData, cloudinary_public_id: e.target.value })}
                  placeholder="e.g., samples/coffee-shop"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Upload Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0C2340] transition-colors dark:border-slate-600 dark:hover:border-primary-400">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCloudinaryUpload(file);
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2 dark:text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {uploading ? 'Uploading...' : 'Click to upload image'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Cloudinary URL *
                </label>
                <input
                  type="url"
                  value={formData.cloudinary_url}
                  onChange={(e) => setFormData({ ...formData, cloudinary_url: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  required
                />
              </div>

              {/* Preview */}
              {formData.cloudinary_url && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden dark:bg-slate-900">
                  <img
                    src={formData.cloudinary_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#0C2340] text-white hover:bg-[#0C2340]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      {editingImage ? 'Update' : 'Add'} Image
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
