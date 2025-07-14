
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
        let width = img.width;
        let height = img.height;
        let quality = 0.9;
        const MAX_ATTEMPTS = 8;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get canvas context."));
        }

        // --- Pass 1: Resize down if necessary and adjust quality ---
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
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
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        let dataUrl: string;
        let currentSizeKB: number;
        let attempts = 0;

        // Iteratively adjust quality to hit the size window
        do {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            currentSizeKB = dataUrl.length * (3 / 4) / 1024;
            attempts++;

            if (currentSizeKB < MIN_SIZE_KB && quality < 1.0) {
                quality += 0.1;
            } else if (currentSizeKB > MAX_SIZE_KB && quality > 0.1) {
                quality -= 0.1;
            } else {
                break; // Target met or quality extremes reached
            }
            quality = Math.max(0.1, Math.min(1.0, quality));
        } while (attempts < MAX_ATTEMPTS);
        
        // --- Pass 2: If still too small, upscale the dimensions and re-render ---
        if (currentSizeKB < MIN_SIZE_KB) {
            let scaleFactor = 1.0;
            const upscaleAttempts = 5;
            let upscaleAttemptCount = 0;

            // Use the last calculated quality, or reset to a high value
            quality = Math.max(quality, 0.9);

            while (currentSizeKB < MIN_SIZE_KB && upscaleAttemptCount < upscaleAttempts) {
                upscaleAttemptCount++;
                // Increase dimensions by 15% each attempt
                scaleFactor *= 1.15; 
                const newWidth = Math.round(width * scaleFactor);
                const newHeight = Math.round(height * scaleFactor);
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                dataUrl = canvas.toDataURL('image/jpeg', quality);
                currentSizeKB = dataUrl.length * (3 / 4) / 1024;

                // If upscaling makes it too big, reduce quality slightly
                if (currentSizeKB > MAX_SIZE_KB) {
                    quality = Math.max(0.1, quality - 0.1);
                }
            }
        }
        
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
