import React from 'react';
import { Bike, Users, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import type { MotorItem, Customer, SalesProfile } from '../types';
import { formatRupiah } from '../services/imageUtils';
import { DRIVE_FOLDER_URL } from '../services/driveService';

interface DashboardViewProps {
  salesProfile: SalesProfile | null;
  motors: MotorItem[];
  customers: Customer[];
  onSelectMotor: (motor: MotorItem) => void;
  onViewAllMotors: () => void;
  onViewAllCustomers: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  salesProfile,
  motors,
  customers,
  onSelectMotor,
  onViewAllMotors,
  onViewAllCustomers,
}) => {
  const salesName = salesProfile?.name || 'Kang Jamhur Motor';
  const recentMotors = motors.slice(0, 4);

  return (
    <div className="space-y-4 pb-20">
      {/* Sales Greeting & Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="relative shrink-0">
            {salesProfile?.photoUrl ? (
              <img
                src={salesProfile.photoUrl}
                alt={salesName}
                className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-700 border-2 border-orange-500 flex items-center justify-center font-bold text-xl text-orange-400">
                {salesName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-orange-400 uppercase tracking-wider block">
              Selamat Bertugas
            </span>
            <h2 className="text-lg font-bold text-white truncate leading-tight">
              {salesName}
            </h2>
            <p className="text-xs text-slate-300 truncate mt-0.5">
              {salesProfile?.phone ? `WA: ${salesProfile.phone}` : 'Aplikasi Penjualan Motor'}
            </p>
          </div>
        </div>
      </div>

      {/* Promotional Banner */}
      {salesProfile?.bannerUrl ? (
        <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200">
          <img
            src={salesProfile.bannerUrl}
            alt="Banner Promosi"
            className="w-full object-cover max-h-36"
          />
        </div>
      ) : (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Promo Spesial Sales
            </span>
            <h3 className="font-extrabold text-sm mt-1">Bantu Customer Dapat Motor Impian</h3>
            <p className="text-xs text-orange-100">Kelola foto Google Drive & buat iklan rapi</p>
          </div>
          <Sparkles className="w-8 h-8 text-amber-200 shrink-0 ml-2" />
        </div>
      )}

      {/* Ringkasan Statistik Bersih (Tanpa Tombol) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Motor Stats */}
        <div
          onClick={onViewAllMotors}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer active:scale-98 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-slate-900">{motors.length}</span>
          </div>
          <div className="mt-2">
            <p className="font-bold text-xs text-slate-800">Motor Siap Jual</p>
            <p className="text-[10px] text-slate-500">Unit terdaftar</p>
          </div>
        </div>

        {/* Customer Stats */}
        <div
          onClick={onViewAllCustomers}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer active:scale-98 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-slate-900">{customers.length}</span>
          </div>
          <div className="mt-2">
            <p className="font-bold text-xs text-slate-800">Database Customer</p>
            <p className="text-[10px] text-slate-500">Kontak prospek</p>
          </div>
        </div>
      </div>

      {/* Google Drive Status Link Badge */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="truncate text-[11px]">Foto tersimpan di Google Drive</span>
        </span>
        <a
          href={DRIVE_FOLDER_URL}
          target="_blank"
          rel="noreferrer"
          className="text-orange-600 font-semibold flex items-center gap-1 text-[11px] hover:underline"
        >
          Buka Drive <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Recent Motorcycles Showcase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pt-1">
          <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">Motor Terbaru</h3>
          {motors.length > 0 && (
            <span className="text-[11px] font-medium text-slate-500">
              Total {motors.length} Unit
            </span>
          )}
        </div>

        {motors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bike className="w-6 h-6" />
            </div>
            <p className="font-bold text-xs text-slate-700">Belum Ada Motor Tersimpan</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Gunakan menu Motor di bilah bawah untuk menambahkan motor baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {recentMotors.map((m) => {
              const mainPhoto = m.photos.find((p) => p.isMain) || m.photos[0];
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMotor(m)}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs cursor-pointer active:scale-98 transition flex flex-col"
                >
                  <div className="aspect-4/3 bg-slate-100 relative overflow-hidden">
                    {mainPhoto?.viewUrl || mainPhoto?.thumbnailUrl ? (
                      <img
                        src={mainPhoto.viewUrl || mainPhoto.thumbnailUrl}
                        alt={m.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Bike className="w-8 h-8" />
                      </div>
                    )}
                    {m.photos.length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded-md font-semibold backdrop-blur-xs">
                        +{m.photos.length} Foto
                      </span>
                    )}
                  </div>
                  <div className="p-2 flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{m.title}</h4>
                    {m.price ? (
                      <p className="text-xs font-black text-orange-600 mt-1">
                        {formatRupiah(m.price)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">Hubungi Penjual</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
