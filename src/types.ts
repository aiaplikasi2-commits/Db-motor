export interface MotorPhoto {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  order: number;
  viewUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
  drivePreviewUrl?: string;
  isMain: boolean;
}

export interface MotorItem {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  description: string;
  originalDescription?: string;
  price?: number;
  mainPhotoId: string;
  photos: MotorPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesProfile {
  userId: string;
  name: string;
  phone: string;
  photoUrl?: string;
  bannerUrl?: string;
  updatedAt: string;
}

export interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  isMain: boolean;
  order: number;
  progress?: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
  uploadedPhoto?: MotorPhoto;
}
