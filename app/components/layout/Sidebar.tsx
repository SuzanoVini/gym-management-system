'use client';

import { BarChart3, Clock, TrendingUp, UserCheck, Users, UserX } from 'lucide-react';
import { useSidebarStore } from '@/store/useSidebarStore';

const tabs = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'intros', label: 'Intros', icon: Users },
  { id: 'signups', label: 'Sign-ups', icon: UserCheck },
  { id: 'cancellations', label: 'Cancellations', icon: UserX },
  { id: 'holds', label: 'Holds', icon: Clock },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { isOpen, closeSidebar } = useSidebarStore();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    // Auto-close sidebar on mobile after selecting a tab
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 top-[var(--header-height)] bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className="app-sidebar" data-state={isOpen ? 'expanded' : 'collapsed'}>
        <nav className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="py-6 px-2 space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`sidebar-item w-full flex items-center gap-3 rounded-lg font-medium text-sm transition-all duration-200 group ${
                    isOpen ? 'px-3 justify-start' : 'px-2 justify-center'
                  } ${isActive ? 'is-active' : ''}`}
                  title={isOpen ? undefined : tab.label}
                  aria-label={tab.label}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`}
                  />
                  {isOpen && (
                    <span className="whitespace-nowrap truncate font-medium">{tab.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
