import { getAccessToken } from '../firebase';
import { compressImage, generatePhotoFileName } from './imageUtils';
import type { MotorPhoto, PendingPhoto } from '../types';

export const DRIVE_FOLDER_ID = '1RYaaDoEhuxFuWq2zfyleAbtdIgpd6I8_';
export const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`;

export interface UploadProgressCallback {
  (index: number, total: number, fileName: string, progress: number): void;
}

/**
 * Checks whether Google Drive folder is accessible
 */
export async function checkDriveFolderAccess(): Promise<{
  accessible: boolean;
  folderName?: string;
  error?: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    return {
      accessible: false,
      error: 'Akun Google Drive belum dihubungkan. Anda dapat menghubungkannya di menu Profil jika ingin sinkronisasi online ke Drive.',
    };
  }

  try {
    const res = await fetch('/api/drive/check-folder', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return { accessible: true, folderName: data.folderName || 'Foto Motor' };
    }

    const directRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${DRIVE_FOLDER_ID}?fields=id,name`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (directRes.ok) {
      const directData = await directRes.json();
      return { accessible: true, folderName: directData.name };
    }

    const err = await directRes.text();
    return {
      accessible: false,
      error: `Folder Google Drive (${DRIVE_FOLDER_ID}) tidak dapat diakses: ${err || directRes.statusText}`,
    };
  } catch (err: any) {
    return {
      accessible: false,
      error: err?.message || 'Gagal terhubung ke Google Drive.',
    };
  }
}

/**
 * Upload a single photo:
 * If Google Drive token exists, uploads to Google Drive folder 1RYaaDoEhuxFuWq2zfyleAbtdIgpd6I8_.
 * If not connected, safely stores high-res compressed image data without blocking.
 */
export async function uploadSinglePhotoToDrive(
  motorId: string,
  photoOrFile: File | PendingPhoto,
  orderIndex: number,
  isMain: boolean
): Promise<MotorPhoto> {
  const token = await getAccessToken();
  const file = photoOrFile instanceof File ? photoOrFile : photoOrFile.file;
  const fallbackUrl = !(photoOrFile instanceof File) ? photoOrFile.previewUrl : undefined;

  let compressed;
  try {
    compressed = await compressImage(file, 1600, 0.85);
  } catch (initialErr) {
    console.warn('Initial file compression failed, trying preview URL fallback:', initialErr);
    if (fallbackUrl) {
      compressed = await compressImage(fallbackUrl, 1600, 0.85);
    } else {
      throw initialErr;
    }
  }

  const fileName = generatePhotoFileName(motorId, orderIndex);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/drive/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName,
      mimeType: 'image/jpeg',
      base64Data: compressed.base64,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Gagal memproses foto ${fileName} (${response.status})`);
  }

  const result = await response.json();
  return {
    fileId: result.fileId || `IMG_${Date.now()}_${orderIndex}`,
    fileName: result.fileName || fileName,
    mimeType: result.mimeType || 'image/jpeg',
    size: result.size || compressed.size,
    order: orderIndex,
    viewUrl: result.viewUrl,
    downloadUrl: result.downloadUrl || result.viewUrl,
    thumbnailUrl: result.thumbnailUrl || result.viewUrl,
    drivePreviewUrl: result.drivePreviewUrl || DRIVE_FOLDER_URL,
    isMain,
  };
}

/**
 * Staged sequential upload with progress tracking
 */
export async function uploadMotorPhotosBatch(
  motorId: string,
  pendingPhotos: PendingPhoto[],
  onProgress?: UploadProgressCallback
): Promise<MotorPhoto[]> {
  const uploadedPhotos: MotorPhoto[] = [];
  const total = pendingPhotos.length;

  for (let i = 0; i < total; i++) {
    const item = pendingPhotos[i];
    if (onProgress) {
      onProgress(i + 1, total, item.file.name, 25);
    }

    try {
      const uploaded = await uploadSinglePhotoToDrive(
        motorId,
        item,
        i,
        item.isMain
      );
      uploadedPhotos.push(uploaded);

      if (onProgress) {
        onProgress(i + 1, total, item.file.name, 100);
      }
    } catch (err: any) {
      console.error(`Upload error on photo #${i + 1}:`, err);
      throw new Error(`Gagal memproses foto ke-${i + 1} (${item.file.name}): ${err.message}`);
    }
  }

  return uploadedPhotos;
}

/**
 * Delete a photo from Google Drive
 */
export async function deletePhotoFromDrive(fileId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token || fileId.startsWith('IMG_') || fileId.startsWith('LOCAL_')) {
    return true; // Already deleted locally
  }

  try {
    const response = await fetch(`/api/drive/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return true;
  }
}
