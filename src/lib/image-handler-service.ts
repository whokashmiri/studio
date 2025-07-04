
/**
 * Compresses an image client-side before upload.
 * Resizes images to a maximum dimension while preserving aspect ratio and converts to JPEG.
 *
 * @param fileDataUrl The file to process, as a base64 Data URI.
 * @param maxWidth The maximum width for the output image.
 * @param quality The quality of the output JPEG image (0 to 1).
 * @returns A promise that resolves to the compressed image as a Data URI or null if input is invalid.
 */
export function processImageForSaving(
  fileDataUrl: string,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!fileDataUrl || !fileDataUrl.startsWith('data:')) {
      console.warn('Image processing: Input is not a valid Data URI.');
      resolve(null);
      return;
    }

    const image = new Image();
    image.src = fileDataUrl;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Failed to get canvas context for image compression.');
        reject(new Error('Failed to get canvas context.'));
        return;
      }

      let { width, height } = image;

      // Calculate new dimensions while preserving aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image to canvas
      ctx.drawImage(image, 0, 0, width, height);

      // Get compressed image Data URI
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      console.log(
        `Image compressed: original size ~${Math.round(fileDataUrl.length / 1024)}KB, new size ~${Math.round(compressedDataUrl.length / 1024)}KB`
      );
      resolve(compressedDataUrl);
    };

    image.onerror = () => {
      console.error('Failed to load image for compression.');
      reject(new Error('Failed to load image.'));
    };
  });
}
