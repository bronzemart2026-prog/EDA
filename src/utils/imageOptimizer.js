/**
 * Client-Side Image Optimizer
 * Compresses and scales images to ~100KB before upload, ensuring lightning-fast uploads
 * and instant rendering while maintaining sharp visual quality for Member Photos and NID cards.
 */

/**
 * Compress an image file to a target size (default 100KB).
 *
 * @param {File} file - Original file from input
 * @param {number} targetKB - Target file size in kilobytes (default: 100)
 * @param {number} maxDimension - Max width or height in pixels (default: 1200)
 * @returns {Promise<File>} - Optimized File object
 */
export async function optimizeImageToTargetSize(file, targetKB = 100, maxDimension = 1200) {
  if (!file || !file.type.startsWith('image/')) {
    return file; // If not an image (e.g. PDF), return original as-is
  }

  const targetBytes = targetKB * 1024;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        let width = img.width;
        let height = img.height;

        // Proportional scale to maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const getBlob = (quality) => {
          return new Promise((res) => {
            canvas.toBlob((b) => res(b), 'image/jpeg', quality);
          });
        };

        // Binary search for optimal JPEG quality (aiming for ~100KB)
        let minQ = 0.25;
        let maxQ = 0.92;
        let bestBlob = null;
        let currentQ = 0.8;
        let attempts = 0;

        while (attempts < 6) {
          const blob = await getBlob(currentQ);
          bestBlob = blob;

          if (blob.size <= targetBytes) {
            if (blob.size >= targetBytes * 0.85 || currentQ >= 0.9) {
              break;
            }
            minQ = currentQ;
            currentQ = (currentQ + maxQ) / 2;
          } else {
            maxQ = currentQ;
            currentQ = (minQ + currentQ) / 2;
          }
          attempts++;
        }

        // If still larger than targetBytes, downscale dimensions by 25% and compress
        if (bestBlob && bestBlob.size > targetBytes) {
          canvas.width = Math.round(width * 0.75);
          canvas.height = Math.round(height * 0.75);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          bestBlob = await getBlob(0.75);
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        const optimizedFile = new File([bestBlob || file], cleanName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        resolve(optimizedFile);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
