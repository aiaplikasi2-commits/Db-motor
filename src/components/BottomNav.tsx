import React from 'react';
import { LayoutDashboard, Bike, Users, Settings } from 'lucide-react';

export type TabType = 'dashboard' | 'motor' | 'customer' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  motorCount: number;
  customerCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  motorCount,
  customerCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 items-center">
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            activeTab === 'dashboard'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition ${
              activeTab === 'dashboard' ? 'bg-orange-100/80 scale-105' : ''
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Dashboard</span>
        </button>

        {/* Motor */}
        <button
          type="button"
          onClick={() => onChangeTab('motor')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            activeTab === 'motor'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`relative p-1 rounded-xl transition ${
              activeTab === 'motor' ? 'bg-orange-100/80 scale-105' : ''
            }`}
          >
            <Bike className="w-5 h-5" />
            {motorCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {motorCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Motor</span>
        </button>

        {/* Customer */}
        <button
          type="button"
          onClick={() => onChangeTab('customer')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            activeTab === 'customer'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`relative p-1 rounded-xl transition ${
              activeTab === 'customer' ? 'bg-orange-100/80 scale-105' : ''
            }`}
          >
            <Users className="w-5 h-5" />
            {customerCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {customerCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Customer</span>
        </button>

        {/* Profile / Settings */}
        <button
          type="button"
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            activeTab === 'profile'
              ? 'text-orange-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition ${
              activeTab === 'profile' ? 'bg-orange-100/80 scale-105' : ''
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Profil</span>
        </button>
      </div>
    </nav>
  );
};
