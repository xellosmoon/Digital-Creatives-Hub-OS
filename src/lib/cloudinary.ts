import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
  api_secret: import.meta.env.VITE_CLOUDINARY_API_SECRET || '',
  secure: true,
});

export { cloudinary };

/**
 * Upload an image to Cloudinary
 * @param file - The file to upload
 * @param folder - The folder to upload to (default: 'hub-gallery')
 * @returns Promise with the upload result
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = 'hub-gallery'
): Promise<{ publicId: string; url: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const buffer = Buffer.from(arrayBuffer);
      
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, crop: 'limit' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              publicId: result.public_id,
              url: result.secure_url,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        }
      ).end(buffer);
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The公共 ID of the image to delete
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
