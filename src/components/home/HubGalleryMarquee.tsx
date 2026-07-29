import { useState, useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GalleryImage {
  id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  title: string;
  category: string;
  badge: string;
}

export default function HubGalleryMarquee(): JSX.Element {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchImages = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('public_gallery')
        .select('*');

      if (error) throw error;

      // If no data from database, use mock data as fallback
      if (!data || data.length === 0) {
        setImages(getMockImages());
      } else {
        setImages(data as GalleryImage[]);
      }
    } catch (err) {
      // Fallback to mock data on error
      setImages(getMockImages());
    }
  };

  // Mock data fallback - using placeholder images that actually work
  const getMockImages = (): GalleryImage[] => [
    {
      id: '1',
      cloudinary_public_id: 'placeholder-1',
      cloudinary_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
      title: 'Morning Collaboration',
      category: 'Coworking',
      badge: '☕ Coworking Lounge',
    },
    {
      id: '2',
      cloudinary_public_id: 'placeholder-2',
      cloudinary_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop',
      title: 'Focus Session',
      category: 'Productivity',
      badge: '💻 Deep Work Zone',
    },
    {
      id: '3',
      cloudinary_public_id: 'placeholder-3',
      cloudinary_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop',
      title: 'Team Brainstorm',
      category: 'Meetings',
      badge: '🎯 Meeting Room',
    },
    {
      id: '4',
      cloudinary_public_id: 'placeholder-4',
      cloudinary_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=600&fit=crop',
      title: 'Podcast Recording',
      category: 'Media',
      badge: '🎙️ Podcast Studio',
    },
    {
      id: '5',
      cloudinary_public_id: 'placeholder-5',
      cloudinary_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
      title: 'Design Sprint',
      category: 'Workshops',
      badge: '🎨 Design Sprint',
    },
    {
      id: '6',
      cloudinary_public_id: 'placeholder-6',
      cloudinary_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
      title: 'Community Hub',
      category: 'Community',
      badge: '👥 Community Space',
    },
    {
      id: '7',
      cloudinary_public_id: 'placeholder-7',
      cloudinary_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop',
      title: 'Creative Session',
      category: 'Studio',
      badge: '✨ Creative Studio',
    },
    {
      id: '8',
      cloudinary_public_id: 'placeholder-8',
      cloudinary_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
      title: 'Workshop Event',
      category: 'Events',
      badge: '🎪 Event Space',
    },
  ];

  // Duplicate images for seamless infinite scroll
  const row1Images = [...images, ...images];
  const row2Images = [...images.slice().reverse(), ...images.slice().reverse()];

  return (
    <section className="py-12 md:py-16 bg-gradient-to-br from-slate-50 via-white to-amber-50 relative overflow-hidden">
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700 border border-amber-200">
            📸 Life at the Hub
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#0C2340] mb-3">
          Where Iligan's Creatives Build & Connect
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A peek inside our coworking spaces, podcast rooms, and community workshops.
        </p>
      </div>

      {/* Marquee Container */}
      <div className="relative">
        {/* Left Edge Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />
        
        {/* Right Edge Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-amber-50 via-amber-50/80 to-transparent z-10 pointer-events-none" />

        {/* Row 1 - Scrolls Right */}
        <div className="flex overflow-hidden mb-6 hover:[animation-play-state:paused]">
          <div className="flex animate-marquee-reverse">
            {row1Images.map((image, index) => (
              <ImageCard
                key={`${image.id}-${index}`}
                image={image}
                onClick={() => setSelectedImage(image)}
              />
            ))}
          </div>
        </div>

        {/* Row 2 - Scrolls Left */}
        <div className="flex overflow-hidden hover:[animation-play-state:paused]">
          <div className="flex animate-marquee">
            {row2Images.map((image, index) => (
              <ImageCard
                key={`${image.id}-${index}`}
                image={image}
                onClick={() => setSelectedImage(image)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <LightboxModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </section>
  );
}

function ImageCard({ image, onClick }: { image: GalleryImage; onClick: () => void }): JSX.Element {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-72 mx-3 cursor-pointer group"
    >
      <div className="relative h-48 md:h-56 rounded-2xl border border-slate-200/80 shadow-md overflow-hidden hover:scale-105 hover:shadow-xl transition-all duration-300">
        {/* Cloudinary Image */}
        <img
          src={image.cloudinary_url}
          alt={image.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badge */}
        <div className="absolute bottom-3 left-3 right-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm">
            {image.badge}
          </span>
        </div>

        {/* Zoom Icon on Hover */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md">
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LightboxModal({ image, onClose }: { image: GalleryImage; onClose: () => void }): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        {/* Image */}
        <img
          src={image.cloudinary_url}
          alt={image.title}
          className="w-full h-auto max-h-[70vh] object-cover"
        />

        {/* Caption */}
        <div className="p-6 bg-gradient-to-r from-slate-50 to-amber-50">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-[#0C2340] mb-2">{image.title}</h3>
              <p className="text-gray-600">{image.category}</p>
            </div>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
              {image.badge}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
