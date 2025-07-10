
/**
 * Compresses an image client-side before upload.
 * Resizes images to a maximum dimension, converts to JPEG, and aims for a target file size.
 *
 * @param fileDataUrl The file to process, as a base64 Data URI.
 * @param maxWidth The maximum width for the output image.
 * @param targetSizeInKB The desired file size in kilobytes.
 * @returns A promise that resolves to the compressed image as a Data URI or null if input is invalid.
 */
export function processImageForSaving(
  fileDataUrl: string,
  maxWidth: number = 1920,
  targetSizeInKB: number = 300
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

      // Iterative compression to meet target size
      let quality = 0.9;
      let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const targetSizeBytes = targetSizeInKB * 1024;
      const MAX_ITERATIONS = 7;
      let iteration = 0;

      // The size of a Base64 string is roughly 4/3 of the original data size.
      // We calculate the byte size from the base64 length.
      let currentSize = compressedDataUrl.length * (3 / 4);

      while (currentSize > targetSizeBytes && quality > 0.1 && iteration < MAX_ITERATIONS) {
        quality -= 0.1; // Reduce quality
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        currentSize = compressedDataUrl.length * (3 / 4);
        iteration++;
      }

      console.log(
        `Image compressed: original size ~${Math.round(fileDataUrl.length / 1024)}KB, new size ~${Math.round(currentSize / 1024)}KB with quality ${quality.toFixed(2)}`
      );
      resolve(compressedDataUrl);
    };

    image.onerror = () => {
      console.error('Failed to load image for compression.');
      reject(new Error('Failed to load image.'));
    };
  });
}
