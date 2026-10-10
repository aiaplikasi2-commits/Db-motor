import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Check,
  User,
  FolderGit2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { SalesProfile } from '../types';
import { ImageCropModal } from '../components/ImageCropModal';
import { DRIVE_FOLDER_ID, DRIVE_FOLDER_URL, checkDriveFolderAccess } from '../services/driveService';

interface ProfileSettingsViewProps {
  salesProfile: SalesProfile | null;
  userId: string;
  userEmail?: string;
  onSaveProfile: (profile: SalesProfile) => Promise<void>;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  salesProfile,
  userId,
  userEmail,
  onSaveProfile,
}) => {
  const [name, setName] = useState(salesProfile?.name || 'Kang Jamhur Motor');
  const [phone, setPhone] = useState(salesProfile?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(salesProfile?.photoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(salesProfile?.bannerUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Crop Modal state
  const [cropTarget, setCropTarget] = useState<'profile' | 'banner' | null>(null);
  const [cropRawImage, setCropRawImage] = useState<string | null>(null);

  // Drive folder check state
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [driveCheckResult, setDriveCheckResult] = useState<{
    checked: boolean;
    accessible: boolean;
    folderName?: string;
    error?: string;
  }>({ checked: false, accessible: true });

  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>, target: 'profile' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropRawImage(event.target?.result as string);
      setCropTarget(target);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCrop = (croppedUrl: string) => {
    if (cropTarget === 'profile') {
      setPhotoUrl(croppedUrl);
    } else if (cropTarget === 'banner') {
      setBannerUrl(croppedUrl);
    }
    setCropTarget(null);
    setCropRawImage(null);
  };

  const handleCheckDriveFolder = async () => {
    setIsCheckingDrive(true);
    try {
      const res = await checkDriveFolderAccess();
      setDriveCheckResult({
        checked: true,
        accessible: res.accessible,
        folderName: res.folderName,
        error: res.error,
      });
    } catch (err: any) {
      setDriveCheckResult({
        checked: true,
        accessible: false,
        error: err.message,
      });
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError('Nama sales wajib diisi.');
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const updatedProfile: SalesProfile = {
        userId,
        name: name.trim(),
        phone: phone.trim(),
        photoUrl: photoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        updatedAt: new Date().toISOString(),
      };

      await onSaveProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan profil sales.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Hidden file inputs */}
      <input
        ref={profileFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSelectImage(e, 'profile')}
      />
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSelectImage(e, 'banner')}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Profil & Pengaturan Sales
          </h2>
          <p className="text-xs text-slate-500">Sesuaikan identitas, banner promosi, & Drive</p>
        </div>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-4">
        {/* Banner Promosi Card & Editor */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Banner Promosi Sales</span>
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" /> Ganti Banner
            </button>
          </div>

          <div
            onClick={() => bannerFileInputRef.current?.click()}
            className="w-full aspect-24/9 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer relative group flex items-center justify-center transition"
          >
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Banner Promosi"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 mt-1">Pilih Banner Promosi</p>
                <p className="text-[10px] text-slate-500">Rasio lebar landscape dengan editor crop</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
              Klik untuk Ubah / Crop Banner
            </div>
          </div>
        </div>

        {/* Foto Profil & Data Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          <span className="text-xs font-bold text-slate-800 block">Identitas Sales</span>

          <div className="flex items-center gap-4">
            <div
              onClick={() => profileFileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full border-2 border-orange-500 overflow-hidden cursor-pointer bg-slate-100 shadow-md group shrink-0 flex items-center justify-center"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto Profil Sales"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                <Camera className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => profileFileInputRef.current?.click()}
                className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs active:scale-95 transition flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-orange-400" />
                Ganti Foto Profil
              </button>
              <p className="text-[10px] text-slate-500">
                Pilih foto dari galeri atau kamera dengan editor crop bulat.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nama Lengkap Sales *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kang Jamhur Motor"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nomor WhatsApp Sales *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 08123456789 (akan otomatis terpasang saat share iklan)"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {userEmail && (
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
              <span>Akun Login:</span>
              <span className="font-semibold text-slate-700 truncate">{userEmail}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profil dan banner promosi berhasil disimpan secara online!</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                SIMPAN PENGATURAN SALES
              </>
            )}
          </button>
        </div>
      </form>

      {/* Google Drive Configuration & Verification Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900">Penyimpanan Google Drive</h3>
              <p className="text-[10px] text-slate-500 font-mono">Folder: {DRIVE_FOLDER_ID}</p>
            </div>
          </div>
          <a
            href={DRIVE_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
            className="text-orange-600 font-bold text-xs flex items-center gap-1 hover:underline"
          >
            Buka Drive <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Semua foto motor diunggah langsung ke folder resmi Google Drive dengan penamaan standar{' '}
          <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono">
            MOTOR_ID_TIMESTAMP_UUID_NOMOR.jpg
          </code>.
        </p>

        <button
          type="button"
          disabled={isCheckingDrive}
          onClick={handleCheckDriveFolder}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
        >
          {isCheckingDrive ? (
            <span className="inline-block w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Cek Izin Akses Folder Drive
            </>
          )}
        </button>

        {driveCheckResult.checked && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              driveCheckResult.accessible
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {driveCheckResult.accessible ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Folder Google Drive Terhubung & Siap Digunakan</p>
                  <p className="text-[11px] text-emerald-700">
                    Akses berhasil diverifikasi. Foto motor akan langsung tersimpan di folder ini.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Folder Google Drive Belum Dapat Diakses</p>
                  <p className="text-[11px] text-red-700 leading-tight">
                    {driveCheckResult.error ||
                      'Pastikan akun Google Anda memiliki akses edit ke folder Google Drive tersebut.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {cropTarget && cropRawImage && (
        <ImageCropModal
          imageSrc={cropRawImage}
          aspectRatio={cropTarget === 'profile' ? 1 : 2.5}
          isCircle={cropTarget === 'profile'}
          title={cropTarget === 'profile' ? 'Atur Crop Foto Profil' : 'Atur Crop Banner Promosi'}
          onSave={handleSaveCrop}
          onClose={() => {
            setCropTarget(null);
            setCropRawImage(null);
          }}
        />
      )}
    </div>
  );
};
