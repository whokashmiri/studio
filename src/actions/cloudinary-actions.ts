
'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Server Action for handling media uploads to Cloudinary.
 * This file contains the secure, server-side logic for uploading images.
 * It is configured to reject video files.
 */

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// Configure Cloudinary using environment variables.
// These must be set in your .env.local file.
// CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads an image file (as a Data URI) to Cloudinary.
 * This function is a Server Action and should only be called from client components.
 * It is restricted to image resource types.
 * 
 * @param fileDataUrl The file to upload, as a base64 Data URI.
 * @returns A promise that resolves to an object with success status and either the URL or an error message.
 */
export async function uploadMedia(fileDataUrl: string): Promise<UploadResponse> {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    console.error('Cloudinary environment variables are not configured.');
    return { success: false, error: 'Cloudinary environment variables are not configured. Cannot upload media.' };
  }
  
  // Detect MIME type from data URL
  const mimeType = fileDataUrl.substring(fileDataUrl.indexOf(':') + 1, fileDataUrl.indexOf(';'));
  if (!mimeType.startsWith('image/')) {
    const errorMsg = 'Invalid file type. Only images can be uploaded to Cloudinary.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const result = await cloudinary.uploader.upload(fileDataUrl, {
      resource_type: "image", // Explicitly set to image
    });
    console.log('Cloudinary upload successful. URL:', result.secure_url);
    return { success: true, url: result.secure_url };
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    return { success: false, error: error?.message || 'Failed to upload image to Cloudinary.' };
  }
}
