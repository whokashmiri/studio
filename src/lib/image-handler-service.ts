
/**
 * @fileOverview A client-side service for handling image compression.
 */

/**
 * Compresses an image file to a target size range (350KB - 700KB).
 *
 * @param file The image file to compress.
 * @returns A Promise that resolves to the compressed image as a base64 Data URI.
 */
export async function compressImage(file: File): Promise<string> {
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1080;
  const MIN_SIZE_KB = 350;
  const MAX_SIZE_KB = 700;
  let quality = 0.9; // Start with a high quality

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("Could not read file."));
      }

      const img = new Image();
      img.src = event.target.result as string;
      img.onload = async () => {
        let { width, height } = img;

        // --- Step 1: Resize the image if it's too large ---
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get canvas context."));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // --- Step 2: Iteratively adjust quality to meet size target ---
        let dataUrl: string;
        let currentSizeKB: number;
        let attempts = 0;
        const MAX_ATTEMPTS = 7; // To prevent infinite loops

        do {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            currentSizeKB = dataUrl.length * (3 / 4) / 1024;
            attempts++;
            
            if (currentSizeKB < MIN_SIZE_KB && quality < 1.0) {
              quality += 0.1; // Increase quality if too small
            } else if (currentSizeKB > MAX_SIZE_KB && quality > 0.1) {
              quality -= 0.1; // Decrease quality if too large
            } else {
              break; // It's in range or we can't adjust further
            }
            
            // Clamp quality between 0.1 and 1.0
            quality = Math.max(0.1, Math.min(1.0, quality));

        } while ((currentSizeKB < MIN_SIZE_KB || currentSizeKB > MAX_SIZE_KB) && attempts < MAX_ATTEMPTS);
        
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
