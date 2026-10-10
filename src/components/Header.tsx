import React from 'react';
import { User, WifiOff, FolderGit2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { SalesProfile } from '../types';

interface HeaderProps {
  currentTab: string;
  salesProfile: SalesProfile | null;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ salesProfile, onOpenProfile }) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-xs overflow-hidden">
          <img
            src="/pwa-192x192.png"
            alt="Jual Motor Icon"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 tracking-tight text-base leading-tight flex items-center gap-1.5">
            JUAL <span className="text-orange-600">MOTOR</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Google Drive & AI Sales
          </p>
        </div>
      </div>

      {/* Right Action: Offline status & Sales Profile Avatar */}
      <div className="flex items-center gap-2">
        {!isOnline && (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <WifiOff className="w-3 h-3 text-amber-700" />
            Offline
          </span>
        )}

        <button
          type="button"
          onClick={onOpenProfile}
          className="relative p-0.5 rounded-full border-2 border-orange-500/80 active:scale-95 transition shadow-xs"
          title="Pengaturan Profil Sales"
        >
          {salesProfile?.photoUrl ? (
            <img
              src={salesProfile.photoUrl}
              alt="Profil Sales"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
