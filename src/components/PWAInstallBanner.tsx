import React, { useState } from 'react';
import { Download, HelpCircle, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // Suppress when already installed or dismissed in current session
  if (isInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowManualGuide(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between gap-2 text-xs border-b border-slate-700/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-400/30 flex items-center justify-center shrink-0 text-orange-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="font-semibold text-white truncate flex items-center gap-1">
              Pasang JUAL MOTOR di HP
              <Sparkles className="w-3 h-3 text-orange-400 inline" />
            </p>
            <p className="text-[11px] text-gray-300 truncate">
              Akses cepat offline & mudah digunakan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            INSTALL
          </button>
          <button
            type="button"
            onClick={() => setShowManualGuide(true)}
            className="p-1 rounded-md text-gray-400 hover:text-white"
            title="Panduan Pasang"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-gray-400 hover:text-white"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Installation Guide Dialog */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
                <Smartphone className="w-5 h-5 text-orange-600" />
                Cara Pasang di HP
              </h3>
              <button
                onClick={() => setShowManualGuide(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs leading-relaxed">
              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">Untuk Pengguna iPhone / iPad Safari:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-gray-600">
                    <li>Tekan tombol <strong>Share</strong> (ikon kotak panah ke atas) di menu Safari.</li>
                    <li>Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong> (Add to Home Screen).</li>
                    <li>Tekan <strong>Tambah</strong> di pojok kanan atas.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">Untuk Pengguna HP Android (Chrome / Browser):</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-gray-600">
                    <li>Buka menu browser dengan mengetuk <strong>titik tiga (⋮)</strong> di pojok kanan atas.</li>
                    <li>Pilih menu <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.</li>
                    <li>Konfirmasi pemasangan, ikon <strong>JUAL MOTOR</strong> akan langsung muncul di layar HP Anda.</li>
                  </ol>
                </div>
              )}

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-orange-800 text-[11px]">
                Aplikasi siap dibuka kapan saja langsung dari beranda HP tanpa perlu membuka browser lagi.
              </div>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
