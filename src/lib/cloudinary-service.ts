
// IMPORTANT: THIS IS A HYBRID SERVICE FOR PROTOTYPING.
// The `uploadToCloudinary` function demonstrates SDK usage for a server environment
// AND provides a client-side simulation.

// FOR A REAL PRODUCTION APP:
// 1. Create a dedicated Next.js API Route or Server Action for Cloudinary uploads.
// 2. Move the server-side logic (the `if (typeof window === 'undefined')` block) to that endpoint.
// 3. The client-side part of this service would then make a `fetch` request to your API endpoint.
// 4. Secure your API endpoint and ensure Cloudinary credentials (API Key, API Secret) are ONLY on the server.

// Required Environment Variables for a real backend implementation:
// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_actual_cloud_name" (can be public)
// CLOUDINARY_API_KEY="your_api_key" (MUST be server-side, NOT prefixed with NEXT_PUBLIC_)
// CLOUDINARY_API_SECRET="your_api_secret" (MUST be server-side, NOT prefixed with NEXT_PUBLIC_)

/**
 * Uploads a file (as a Data URI) to Cloudinary if in a server context,
 * otherwise simulates the upload on the client by returning the Data URI.
 * 
 * @param fileDataUrl The file to upload, as a base64 Data URI.
 * @returns A promise that resolves to the Cloudinary URL (on server success) or the original fileDataUrl (for client simulation).
 */
export async function uploadToCloudinary(fileDataUrl: string): Promise<string | null> {
  // --- SERVER-SIDE LOGIC ---
  // This block is intended for a server-side environment (e.g., Next.js API Route or Server Action).
  if (typeof window === 'undefined') {
    console.log('Attempting Cloudinary upload (server-side context)...');
    try {
      // Dynamically require to avoid client-side bundling issues if this file is analyzed by client bundler.
      const cloudinary = require('cloudinary').v2;

      if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        console.error('Cloudinary API Key, Secret, or Cloud Name is not configured on the server. Falling back to client simulation for prototype. Image will be a data URI.');
        // In a real server-only scenario, you'd throw an error or return a proper error response here.
        // For prototype consistency when server config is missing, we fall through to client-side simulation.
      } else {
        cloudinary.config({
          cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        });

        const result = await cloudinary.uploader.upload(fileDataUrl, {
          resource_type: "auto", 
        });
        console.log('Actual Cloudinary upload successful (server-side context). URL to be stored:', result.secure_url);
        return result.secure_url;
      }
    } catch (error) {
      console.error("Cloudinary Upload Error (server-side context). Falling back to client simulation. Error:", error);
      // Fall through to client-side simulation for prototyping if server logic fails.
      // In a pure server endpoint, you would return an appropriate error response or throw.
    }
  }

  // --- CLIENT-SIDE SIMULATION / FALLBACK ---
  // This path is taken if not in a server context OR if the server-side block above
  // encountered an issue (like missing config) and didn't return.
  console.log('Executing client-side simulation for Cloudinary upload...');
  // Simulate a short network delay for client-side feedback
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

  if (!fileDataUrl || !fileDataUrl.startsWith('data:')) {
    console.warn('Simulated upload (client-side): Input does not appear to be a valid Data URI. This might cause display issues.');
  }
  
  console.log('Client-side simulation complete. URL to be stored (Data URI):', fileDataUrl.substring(0, 100) + (fileDataUrl.length > 100 ? '...' : '')); // Log a snippet for brevity
  return fileDataUrl; 
}
