'use client';
import { LogOut, Menu } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
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
            className="btn-icon rounded-md flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onLogoClick}
            className="app-logo-wrap flex items-center min-w-0 bg-transparent hover:opacity-80 cursor-pointer"
            aria-label="Go to overview"
          >
            <BrandLogo className="app-logo" width={220} height={48} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          className="btn btn-tertiary flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}
