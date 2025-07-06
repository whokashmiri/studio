'use server';

import { v2 as cloudinary } from 'cloudinary';

/**
 * @fileOverview Server Action for handling image uploads to Cloudinary.
 * This file contains the secure, server-side logic for uploading images.
 */

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
 * Uploads a file (as a Data URI) to Cloudinary.
 * This function is a Server Action and should only be called from client components.
 * 
 * @param fileDataUrl The file to upload, as a base64 Data URI.
 * @returns A promise that resolves to the secure Cloudinary URL of the uploaded image.
 * @throws An error if the upload fails or if environment variables are not set.
 */
export async function uploadImage(fileDataUrl: string): Promise<string> {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary environment variables are not configured. Cannot upload image.');
  }

  try {
    const result = await cloudinary.uploader.upload(fileDataUrl, {
      resource_type: "auto",
    });
    console.log('Cloudinary upload successful. URL:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error('Failed to upload image to Cloudinary.');
  }
}
