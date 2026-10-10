import React, { useState } from 'react';
import {
  ChevronLeft,
  Share2,
  Edit3,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type { MotorItem, MotorPhoto } from '../types';
import { formatRupiah } from '../services/imageUtils';
import { ShareModal } from '../components/ShareModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface MotorDetailViewProps {
  motor: MotorItem;
  salesPhone?: string;
  onBack: () => void;
  onEdit: (motor: MotorItem) => void;
  onDelete: (motor: MotorItem) => Promise<void>;
}

export const MotorDetailView: React.FC<MotorDetailViewProps> = ({
  motor,
  salesPhone,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activePhoto: MotorPhoto | undefined = motor.photos[selectedPhotoIndex] || motor.photos[0];

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(motor.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = motor.description;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(motor);
      onBack();
    } catch (err: any) {
      alert(`Gagal menghapus motor: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleWhatsAppQuickShare = () => {
    const text = encodeURIComponent(
      `${motor.description}\n\n📸 Foto: ${activePhoto?.viewUrl || ''}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 py-1.5 px-3 rounded-xl shadow-2xs active:scale-95 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>

        <span className="text-[11px] font-semibold text-slate-500">
          ID: {motor.id.slice(-8)}
        </span>
      </div>

      {/* Big Main Photo Showcase */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-md relative aspect-16/11">
        {activePhoto?.viewUrl || activePhoto?.thumbnailUrl ? (
          <img
            src={activePhoto.viewUrl || activePhoto.thumbnailUrl}
            alt={motor.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            Foto tidak tersedia
          </div>
        )}

        {/* Floating Price Badge */}
        {motor.price ? (
          <div className="absolute bottom-3 left-3 bg-orange-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-lg">
            {formatRupiah(motor.price)}
          </div>
        ) : null}

        {/* Photo Counter */}
        <div className="absolute top-3 right-3 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-xs">
          {selectedPhotoIndex + 1} / {motor.photos.length}
        </div>
      </div>

      {/* Scrollable Gallery Thumbnails */}
      {motor.photos.length > 1 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-600 px-1">Galeri Foto:</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {motor.photos.map((p, idx) => (
              <button
                key={p.fileId || idx}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition active:scale-95 ${
                  selectedPhotoIndex === idx
                    ? 'border-orange-500 ring-2 ring-orange-500/20'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                <img
                  src={p.thumbnailUrl || p.viewUrl}
                  alt={p.fileName}
                  className="w-full h-full object-cover"
                />
                {p.isMain && (
                  <span className="absolute bottom-0 inset-x-0 bg-orange-600 text-white text-[8px] font-bold text-center py-0.2">
                    Utama
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title & Description Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900 leading-snug">
            {motor.title}
          </h2>
          <button
            type="button"
            onClick={handleCopyText}
            className="shrink-0 p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition"
            title="Salin Teks Iklan"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Description Body */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
          {motor.description}
        </div>

        {/* Google Drive Photo Link Reference */}
        {activePhoto?.viewUrl && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              File: {activePhoto.fileName}
            </span>
            <a
              href={activePhoto.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 font-semibold flex items-center gap-0.5 hover:underline"
            >
              Lihat di Drive <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* 3 AKSI UTAMA WAJIB: BAGIKAN, EDIT, HAPUS */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-xl">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          {/* 1. BAGIKAN */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            BAGIKAN
          </button>

          {/* 2. EDIT */}
          <button
            type="button"
            onClick={() => onEdit(motor)}
            className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-4 h-4 text-orange-400" />
            EDIT
          </button>

          {/* 3. HAPUS */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="py-3 px-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            HAPUS
          </button>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <ShareModal
          motor={motor}
          salesPhone={salesPhone}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <ConfirmationModal
          title="Hapus Iklan Motor?"
          message={`Apakah Anda yakin ingin menghapus data motor "${motor.title}" beserta ${motor.photos.length} foto dari Google Drive? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, Hapus Sekarang"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
};
