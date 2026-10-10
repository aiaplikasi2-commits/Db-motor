import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Undo2,
  Trash2,
  Star,
  Eye,
  X,
  AlertCircle,
  Bike,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import type { MotorItem, PendingPhoto, MotorPhoto } from '../types';
import { formatRupiah, extractPriceFromText } from '../services/imageUtils';
import { uploadMotorPhotosBatch, deletePhotoFromDrive } from '../services/driveService';
import { refineMotorAdWithAI } from '../services/aiService';

interface MotorViewProps {
  motors: MotorItem[];
  userId: string;
  userEmail?: string;
  onSaveMotor: (motorData: Omit<MotorItem, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => Promise<void>;
  onDeleteMotor: (motor: MotorItem) => Promise<void>;
  onSelectMotor: (motor: MotorItem) => void;
  initialAddMode?: boolean;
}

export const MotorView: React.FC<MotorViewProps> = ({
  motors,
  userId,
  userEmail,
  onSaveMotor,
  onSelectMotor,
  initialAddMode = false,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(initialAddMode);
  const [editingMotor, setEditingMotor] = useState<MotorItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [description, setDescription] = useState('');
  const [originalDraftText, setOriginalDraftText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Photos State
  const [existingPhotos, setExistingPhotos] = useState<MotorPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Upload & Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenAdd = () => {
    setEditingMotor(null);
    setDescription('');
    setOriginalDraftText('');
    setExistingPhotos([]);
    setPendingPhotos([]);
    setAiError(null);
    setAiSuccessMessage(null);
    setSaveError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (motor: MotorItem) => {
    setEditingMotor(motor);
    setDescription(motor.description);
    setOriginalDraftText(motor.originalDescription || motor.description);
    setExistingPhotos([...motor.photos]);
    setPendingPhotos([]);
    setAiError(null);
    setAiSuccessMessage(null);
    setSaveError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMotor(null);
    setPendingPhotos([]);
  };

  // Add files to pending queue
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPending: PendingPhoto[] = [];
    const currentCount = existingPhotos.length + pendingPhotos.length;

    Array.from(files).forEach((file, index) => {
      const isFirstOverall = currentCount === 0 && index === 0;
      const previewUrl = URL.createObjectURL(file);
      newPending.push({
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        file,
        previewUrl,
        isMain: isFirstOverall,
        order: currentCount + index,
        status: 'idle',
      });
    });

    setPendingPhotos((prev) => [...prev, ...newPending]);
  };

  // Toggle main photo
  const handleSetMainPhoto = (id: string, isPending: boolean) => {
    if (isPending) {
      setPendingPhotos((prev) =>
        prev.map((p) => ({ ...p, isMain: p.id === id }))
      );
      setExistingPhotos((prev) =>
        prev.map((p) => ({ ...p, isMain: false }))
      );
    } else {
      setExistingPhotos((prev) =>
        prev.map((p) => ({ ...p, isMain: p.fileId === id }))
      );
      setPendingPhotos((prev) =>
        prev.map((p) => ({ ...p, isMain: false }))
      );
    }
  };

  // Remove photo
  const handleRemovePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      // If we removed the main photo, ensure one is designated
      if (filtered.length > 0 && !filtered.some((p) => p.isMain) && !existingPhotos.some((p) => p.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered;
    });
  };

  const handleRemoveExistingPhoto = async (photo: MotorPhoto) => {
    const confirmDelete = window.confirm(
      `Hapus foto ${photo.fileName} dari Google Drive dan iklan motor ini?`
    );
    if (!confirmDelete) return;

    try {
      await deletePhotoFromDrive(photo.fileId);
      setExistingPhotos((prev) => {
        const filtered = prev.filter((p) => p.fileId !== photo.fileId);
        if (filtered.length > 0 && !filtered.some((p) => p.isMain) && !pendingPhotos.some((p) => p.isMain)) {
          filtered[0].isMain = true;
        }
        return filtered;
      });
    } catch (err: any) {
      alert(`Gagal menghapus foto dari Drive: ${err.message}`);
    }
  };

  // AI Refine Action
  const handleAiRefine = async () => {
    if (!description.trim()) {
      setAiError('Silakan ketik teks motor terlebih dahulu sebelum klik perbaiki AI.');
      return;
    }

    setAiError(null);
    setAiSuccessMessage(null);
    setIsAiLoading(true);

    // Save original for undo if not already saved
    if (!originalDraftText) {
      setOriginalDraftText(description);
    }

    try {
      const refined = await refineMotorAdWithAI(description);
      setDescription(refined);
      setAiSuccessMessage('Teks berhasil dirapikan dengan AI! Anda tetap dapat mengeditnya.');
    } catch (err: any) {
      setAiError(err.message || 'Gagal menghubungi asisten AI.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRevertAi = () => {
    if (originalDraftText) {
      setDescription(originalDraftText);
      setAiSuccessMessage(null);
      setAiError(null);
    }
  };

  // Save Motor Item
  const handleSave = async () => {
    const totalPhotos = existingPhotos.length + pendingPhotos.length;
    if (totalPhotos === 0) {
      setSaveError('Wajib menyertakan minimal satu foto motor.');
      return;
    }

    if (!description.trim()) {
      setSaveError('Keterangan motor wajib diisi.');
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const motorId = editingMotor ? editingMotor.id : `MTR_${Date.now()}`;

      // 1. Upload pending photos sequentially to Google Drive
      let newUploadedPhotos: MotorPhoto[] = [];
      if (pendingPhotos.length > 0) {
        newUploadedPhotos = await uploadMotorPhotosBatch(
          motorId,
          pendingPhotos,
          (current, total, fileName) => {
            setSaveProgress({ current, total, fileName });
          }
        );
      }

      // Combine existing photos and freshly uploaded photos
      const allPhotos = [...existingPhotos, ...newUploadedPhotos];

      // Re-normalize isMain
      const hasMain = allPhotos.some((p) => p.isMain);
      if (!hasMain && allPhotos.length > 0) {
        allPhotos[0].isMain = true;
      }

      const mainPhoto = allPhotos.find((p) => p.isMain) || allPhotos[0];

      // Extract title from first line or motor description
      const lines = description
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const firstLine = lines[0] ? lines[0].replace(/^[#* \-_]+/, '').slice(0, 80) : 'Motor Dijual';
      const parsedPrice = extractPriceFromText(description);

      const motorPayload: Omit<MotorItem, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        userEmail: userEmail || '',
        title: firstLine,
        description: description.trim(),
        originalDescription: originalDraftText || description.trim(),
        price: typeof parsedPrice === 'number' ? parsedPrice : 0,
        mainPhotoId: mainPhoto?.fileId || '',
        photos: allPhotos,
      };

      await onSaveMotor(motorPayload, editingMotor?.id);
      setIsFormOpen(false);
      setEditingMotor(null);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveError(err.message || 'Gagal menyimpan motor. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  // Filtered listing
  const filteredMotors = motors.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Header */}
      {!isFormOpen && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Daftar Motor ({motors.length})
              </h2>
              <p className="text-xs text-slate-500">Iklan motor siap posting & berbagi</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="py-2.5 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              TAMBAH MOTOR
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari motor (nama, merk, tahun)..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* FORM TAMBAH / EDIT MOTOR */}
      {isFormOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handleCloseForm}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" /> Batal
            </button>
            <h3 className="font-extrabold text-sm text-slate-900">
              {editingMotor ? 'Edit Iklan Motor' : 'Tambah Motor Baru'}
            </h3>
            <span className="w-10" />
          </div>

          {/* 1. AREA UPLOAD FOTO DI ATAS KETERANGAN */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Foto Motor (Tersimpan ke Google Drive)
            </label>

            {/* Hidden File Inputs for Gallery & Camera */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Combined Upload Area Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-100 shadow-2xs active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-orange-600" />
                  GALERI
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-100 shadow-2xs active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-orange-600" />
                  KAMERA
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Pilih atau foto motor langsung. Mendukung banyak foto sekaligus.
              </p>
            </div>

            {/* Real Thumbnails Preview */}
            {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Foto Terpilih ({existingPhotos.length + pendingPhotos.length}):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {/* Existing Photos */}
                  {existingPhotos.map((p) => (
                    <div
                      key={p.fileId}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-100 shadow-2xs group ${
                        p.isMain ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={p.thumbnailUrl || p.viewUrl}
                        alt={p.fileName}
                        className="w-full h-full object-cover"
                      />
                      {/* Main Badge */}
                      {p.isMain && (
                        <span className="absolute top-1 left-1 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          Utama
                        </span>
                      )}

                      {/* Photo overlay actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center gap-1.5 transition">
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(p.viewUrl)}
                          className="p-1 rounded-full bg-white/90 text-slate-800"
                          title="Lihat Besar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!p.isMain && (
                          <button
                            type="button"
                            onClick={() => handleSetMainPhoto(p.fileId, false)}
                            className="p-1 rounded-full bg-white/90 text-orange-600"
                            title="Jadikan Utama"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingPhoto(p)}
                          className="p-1 rounded-full bg-white/90 text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Pending Photos */}
                  {pendingPhotos.map((p) => (
                    <div
                      key={p.id}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-100 shadow-2xs group ${
                        p.isMain ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={p.previewUrl}
                        alt="Foto Baru"
                        className="w-full h-full object-cover"
                      />
                      {p.isMain && (
                        <span className="absolute top-1 left-1 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          Utama
                        </span>
                      )}
                      <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[8px] font-semibold px-1 rounded">
                        Baru
                      </span>

                      {/* Photo overlay actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center gap-1.5 transition">
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(p.previewUrl)}
                          className="p-1 rounded-full bg-white/90 text-slate-800"
                          title="Lihat Besar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!p.isMain && (
                          <button
                            type="button"
                            onClick={() => handleSetMainPhoto(p.id, true)}
                            className="p-1 rounded-full bg-white/90 text-orange-600"
                            title="Jadikan Utama"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePendingPhoto(p.id)}
                          className="p-1 rounded-full bg-white/90 text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. SATU KOLOM BESAR KETERANGAN MOTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Keterangan Motor (Teks Bebas)
              </label>
              {originalDraftText && originalDraftText !== description && (
                <button
                  type="button"
                  onClick={handleRevertAi}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Kembalikan Teks Asli
                </button>
              )}
            </div>

            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tulis keterangan motor bebas, contoh:
vario 160 tahun 2023 warna hitam pajak panjang mesin halus surat lengkap harga 21 juta bisa nego"
              className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition leading-relaxed"
            />

            {/* AI Success / Error message */}
            {aiSuccessMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}

            {aiError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          {/* 3. TOMBOL PERBAIKI DENGAN AI */}
          <div>
            <button
              type="button"
              disabled={isAiLoading || isSaving}
              onClick={handleAiRefine}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 hover:from-indigo-800 hover:to-slate-800 text-white font-bold text-xs shadow-sm active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAiLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI Sedang Merapikan Teks Iklan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  PERBAIKI DENGAN AI
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1">
              AI merapikan ejaan & format iklan tanpa mengarang fakta atau harga.
            </p>
          </div>

          {/* Save Progress Bar */}
          {saveProgress && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5 text-xs text-orange-950">
              <div className="flex justify-between font-semibold text-[11px]">
                <span>Mengunggah foto ke Google Drive...</span>
                <span>
                  {saveProgress.current} dari {saveProgress.total}
                </span>
              </div>
              <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-600 h-full transition-all duration-300"
                  style={{
                    width: `${(saveProgress.current / saveProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-orange-800 truncate">
                File: {saveProgress.fileName}
              </p>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* 4. TOMBOL SIMPAN */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleCloseForm}
              className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-98 transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSaving || isAiLoading}
              onClick={handleSave}
              className="flex-1 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan ke Drive & Firestore...
                </>
              ) : (
                'SIMPAN IKLAN MOTOR'
              )}
            </button>
          </div>
        </div>
      )}

      {/* DAFTAR MOTOR: SINGLE-COLUMN CARDS FOR ANDROID MOBILE */}
      {!isFormOpen && (
        <div className="space-y-3">
          {filteredMotors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bike className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? 'Tidak ada motor yang cocok dengan pencarian.'
                  : 'Belum ada motor yang tersimpan.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Tambah Motor Sekarang
                </button>
              )}
            </div>
          ) : (
            filteredMotors.map((m) => {
              const primaryPhoto = m.photos.find((p) => p.isMain) || m.photos[0];

              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMotor(m)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md cursor-pointer active:scale-99 transition flex flex-col"
                >
                  {/* Big Main Photo */}
                  <div className="aspect-16/10 bg-slate-900 relative overflow-hidden">
                    {primaryPhoto?.viewUrl || primaryPhoto?.thumbnailUrl ? (
                      <img
                        src={primaryPhoto.viewUrl || primaryPhoto.thumbnailUrl}
                        alt={m.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Bike className="w-12 h-12" />
                      </div>
                    )}

                    {/* Photo count indicator */}
                    <span className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-1 rounded-lg">
                      {m.photos.length} Foto
                    </span>

                    {/* Price Tag Overlay if available */}
                    {m.price ? (
                      <span className="absolute bottom-3 left-3 bg-orange-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">
                        {formatRupiah(m.price)}
                      </span>
                    ) : null}
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 space-y-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                      {m.title}
                    </h3>

                    {/* Snippet */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Drive: {primaryPhoto?.fileName || 'Foto Motor'}</span>
                      <span className="text-orange-600 font-bold flex items-center gap-1">
                        Buka Detail →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Large Image Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-lg w-full">
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-orange-400"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewModalUrl}
              alt="Pratinjau Foto Motor"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
