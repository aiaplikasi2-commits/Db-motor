/**
 * Image Utilities for JUAL MOTOR
 * Compresses images for mobile stability while preserving high clarity.
 * Formats unique filenames as required: MOTOR_ID_TIMESTAMP_UUID_NOMOR.jpg
 */

export function generatePhotoFileName(
  motorId: string,
  index: number
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomUuid = Math.random().toString(36).substring(2, 8).toUpperCase();
  const photoIndex = pad(index + 1);

  // Clean motorId to keep filename safe
  const cleanMotorId = motorId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'MOTOR';

  return `MOTOR_${cleanMotorId}_${dateStr}_${timeStr}_${randomUuid}_${photoIndex}.jpg`;
}

/**
 * Resilient Image Compressor using HTML5 Canvas & createImageBitmap
 * Handles File, Blob, or URL string directly.
 * Prevents FileReader NotReadableError on mobile camera files.
 */
export async function compressImage(
  input: File | Blob | string,
  maxDimension = 1600,
  quality = 0.85
): Promise<{
  blob: Blob;
  base64: string;
  size: number;
}> {
  // Method 1: Try modern createImageBitmap directly (handles camera EXIF & avoids FileReader)
  if (typeof createImageBitmap === 'function' && typeof input !== 'string') {
    try {
      const bitmap = await createImageBitmap(input);
      let { width, height } = bitmap;

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
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const base64 = canvas.toDataURL('image/jpeg', quality);
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), 'image/jpeg', quality)
        );

        if (blob) {
          return { blob, base64, size: blob.size };
        }
      }
    } catch (bitmapErr) {
      console.warn('createImageBitmap failed, falling back to Image/objectURL:', bitmapErr);
    }
  }

  // Method 2: HTML Image with ObjectURL / arrayBuffer / FileReader fallback
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    let imgSrc = '';

    if (typeof input === 'string') {
      imgSrc = input;
    } else {
      try {
        objectUrl = URL.createObjectURL(input);
        imgSrc = objectUrl;
      } catch (e) {
        console.warn('URL.createObjectURL failed:', e);
      }
    }

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
      }
    };

    const processImage = (img: HTMLImageElement) => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        cleanup();
        return reject(new Error('Dimensi gambar tidak valid'));
      }

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
      if (!ctx) {
        cleanup();
        return reject(new Error('Canvas context tidak tersedia'));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            return reject(new Error('Gagal mengompresi gambar'));
          }
          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve({
            blob,
            base64,
            size: blob.size,
          });
        },
        'image/jpeg',
        quality
      );
    };

    const tryArrayBuffer = () => {
      if (typeof input !== 'string' && typeof input.arrayBuffer === 'function') {
        input
          .arrayBuffer()
          .then((buf) => {
            const blob = new Blob([buf], { type: (input as File).type || 'image/jpeg' });
            const u = URL.createObjectURL(blob);
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => {
              URL.revokeObjectURL(u);
              processImage(im);
            };
            im.onerror = () => {
              URL.revokeObjectURL(u);
              tryFileReader();
            };
            im.src = u;
          })
          .catch(() => tryFileReader());
      } else {
        tryFileReader();
      }
    };

    const tryFileReader = () => {
      if (typeof input === 'string') {
        cleanup();
        return reject(new Error('Format gambar tidak didukung'));
      }
      const reader = new FileReader();
      reader.onerror = () => {
        cleanup();
        reject(new Error('Gagal membaca file gambar'));
      };
      reader.onload = (e) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => {
          cleanup();
          processImage(im);
        };
        im.onerror = () => {
          cleanup();
          reject(new Error('Format gambar tidak valid'));
        };
        im.src = e.target?.result as string;
      };
      reader.readAsDataURL(input);
    };

    if (imgSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImage(img);
      img.onerror = () => {
        cleanup();
        tryArrayBuffer();
      };
      img.src = imgSrc;
    } else {
      tryArrayBuffer();
    }
  });
}

/**
 * Parses and formats Rupiah currency
 */
export function formatRupiah(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Extracts numeric price from unstructured Indonesian motor ad text
 * Handles expressions like:
 * "harga 21 juta", "21jt", "21.000.000", "Rp 21.500.000", "21,5 jt"
 */
export function extractPriceFromText(text: string): number | undefined {
  if (!text) return undefined;

  // 1. Matches "21.5 jt", "21,5 juta", "21 juta", "21jt"
  const jutaRegex = /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i;
  const jutaMatch = text.match(jutaRegex);
  if (jutaMatch) {
    const numStr = jutaMatch[1].replace(',', '.');
    const val = parseFloat(numStr);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000000);
    }
  }

  // 2. Matches "Rp 21.000.000", "Rp21000000", "harga 21000000"
  const rpRegex = /(?:rp|harga)\s*[:.]?\s*(\d{1,3}(?:\.\d{3}){2,3}|\d{7,9})/i;
  const rpMatch = text.match(rpRegex);
  if (rpMatch) {
    const rawDigits = rpMatch[1].replace(/\./g, '');
    const val = parseInt(rawDigits, 10);
    if (!isNaN(val) && val > 500000) {
      return val;
    }
  }

  // 3. Fallback to any standalone 7-8 digit sequence (e.g. 18500000)
  const standaloneRegex = /\b(\d{7,8})\b/;
  const standaloneMatch = text.match(standaloneRegex);
  if (standaloneMatch) {
    const val = parseInt(standaloneMatch[1], 10);
    if (!isNaN(val) && val >= 1000000 && val <= 500000000) {
      return val;
    }
  }

  return undefined;
}
