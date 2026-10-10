import React, { useState } from 'react';
import { Share2, Copy, Check, MessageSquare, ExternalLink, X, Image as ImageIcon, Info } from 'lucide-react';
import type { MotorItem } from '../types';

interface ShareModalProps {
  motor: MotorItem;
  salesPhone?: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ motor, salesPhone, onClose }) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate clean shareable text
  const primaryPhoto = motor.photos.find((p) => p.isMain) || motor.photos[0];
  const photoLinks = motor.photos
    .map((p, idx) => `Foto ${idx + 1}: ${p.viewUrl || p.drivePreviewUrl}`)
    .join('\n');

  const shareText = `${motor.description}

📸 Lihat Foto Motor:
${photoLinks}

${salesPhone ? `📲 Kontak Sales: https://wa.me/${salesPhone.replace(/\D/g, '')}` : ''}`.trim();

  // Web Share API
  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleWebShare = async () => {
    try {
      if (canWebShare) {
        await navigator.share({
          title: motor.title,
          text: shareText,
          url: primaryPhoto?.viewUrl || undefined,
        });
      }
    } catch (err) {
      console.log('Web share cancelled or unsupported', err);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Bagikan Iklan Motor</h3>
              <p className="text-xs text-gray-500 truncate max-w-[240px]">{motor.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Public Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Tautan Foto Google Drive</p>
            <p className="text-[11px] text-blue-700 leading-tight">
              Foto dapat dibuka langsung oleh calon pembeli melalui tautan Google Drive publik yang telah disiapkan.
            </p>
          </div>
        </div>

        {/* Preview of Text */}
        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
          {shareText}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          {/* WhatsApp Direct */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            Kirim ke WhatsApp
          </button>

          {/* Native Android Web Share */}
          {canWebShare && (
            <button
              type="button"
              onClick={handleWebShare}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Share2 className="w-4 h-4" />
              Menu Berbagi Bawaan Android
            </button>
          )}

          {/* Copy Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-white text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-98"
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Teks & Link Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                Salin Teks Iklan Lengkap
              </>
            )}
          </button>
        </div>

        {/* Direct Link to Main Photo */}
        {primaryPhoto?.viewUrl && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
              {motor.photos.length} foto tersimpan di Drive
            </span>
            <a
              href={primaryPhoto.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 hover:underline flex items-center gap-1 font-medium"
            >
              Buka di Drive <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
