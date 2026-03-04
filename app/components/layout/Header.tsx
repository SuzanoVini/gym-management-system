'use client';
import { LogOut, Menu } from 'lucide-react';
import Image from 'next/image';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useAuth } from '../providers/AuthProvider';

interface HeaderProps {
  onLogoClick: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  const { signOut } = useAuth();
  const { toggleSidebar } = useSidebarStore();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="app-header">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2.5 text-slate-700 bg-white/40 hover:bg-white/60 backdrop-blur-sm rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95 border border-slate-200/50 hover:border-slate-300/70 shadow-soft hover:shadow-soft-lg cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={onLogoClick}
            className="app-logo-wrap flex items-center min-w-0 bg-transparent transition-opacity duration-200 hover:opacity-80 cursor-pointer"
            aria-label="Go to overview"
          >
            <Image
              src="/brand/gb-logo-title.png"
              alt="Gracie Barra Kitsilano"
              className="app-logo"
              width={220}
              height={48}
              priority
            />
          </button>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/40 text-slate-700 border border-slate-300/70 hover:border-red-400 hover:bg-red-50/80 hover:text-red-600 backdrop-blur-sm rounded-lg transition-all duration-200 flex-shrink-0 shadow-soft hover:shadow-soft-lg active:scale-95 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}
