'use client';

import {
  BarChart3,
  BookUser,
  CheckSquare,
  Clock,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSidebarStore } from '@/store/useSidebarStore';
import ProfileSection from './ProfileSection';

const tabs = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'intros', label: 'Intros', icon: Users },
  { id: 'followups', label: 'Follow Ups', icon: CheckSquare },
  { id: 'signups', label: 'Sign-ups', icon: UserCheck },
  { id: 'cancellations', label: 'Cancellations', icon: UserX },
  { id: 'holds', label: 'Holds', icon: Clock },
  { id: 'members', label: 'Members', icon: BookUser },
  { id: 'payroll', label: 'Payroll', icon: DollarSign, route: '/payroll' },
  { id: 'admin', label: 'Users', icon: ShieldCheck, route: '/admin' },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  followUpBadgeCount?: number;
}

interface TabItemProps {
  tab: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    route?: string;
  };
  isActive: boolean;
  isOpen: boolean;
  onTabClick: (tabId: string, route?: string) => void;
  onMobileClose: () => void;
  badge?: number | undefined;
}

function PayrollLink({ tab, isActive, isOpen, onMobileClose }: TabItemProps) {
  const Icon = tab.icon;
  return (
    <a
      href={tab.route}
      target="_blank"
      rel="noopener noreferrer"
      className={`sidebar-item w-full flex items-center gap-3 rounded-lg font-medium text-sm transition-all duration-250 group cursor-pointer ${
        isOpen ? 'px-3 justify-start' : 'px-2 justify-center'
      } ${isActive ? 'is-active' : ''}`}
      title={isOpen ? undefined : tab.label}
      aria-label={tab.label}
      onClick={() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          onMobileClose();
        }
      }}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 group-hover:rotate-3'} transition-all duration-250`}
      />
      {isOpen && (
        <span className="whitespace-nowrap truncate font-medium tracking-wide">{tab.label}</span>
      )}
    </a>
  );
}

function TabButton({ tab, isActive, isOpen, onTabClick, badge }: TabItemProps) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onTabClick(tab.id, tab.route)}
      className={`sidebar-item w-full flex items-center gap-3 rounded-lg font-medium text-sm transition-all duration-250 group cursor-pointer ${
        isOpen ? 'px-3 justify-start' : 'px-2 justify-center'
      } ${isActive ? 'is-active' : ''}`}
      title={isOpen ? undefined : tab.label}
      aria-label={tab.label}
    >
      <span className="relative inline-flex">
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 group-hover:rotate-3'} transition-all duration-250`}
        />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {isOpen && (
        <span className="whitespace-nowrap truncate font-medium tracking-wide">{tab.label}</span>
      )}
    </button>
  );
}

function TabItem(props: TabItemProps) {
  if (props.tab.id === 'payroll' && props.tab.route) {
    return <PayrollLink {...props} />;
  }
  return <TabButton {...props} />;
}

export default function Sidebar({ activeTab, setActiveTab, followUpBadgeCount = 0 }: SidebarProps) {
  const { isOpen, closeSidebar } = useSidebarStore();
  const { isOwner } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const visibleTabs = isOwner ? tabs : tabs.filter((t) => t.id !== 'admin');

  const handleTabClick = (tabId: string, route?: string) => {
    if (route && tabId !== 'payroll') {
      // Navigate to route (except payroll which opens in new tab)
      router.push(route);
    } else if (tabId !== 'payroll') {
      // Switch tab in current page
      setActiveTab(tabId);
    }

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
        <nav className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex flex-col">
          <div className="py-6 px-2 space-y-1.5 flex-1">
            {visibleTabs.map((tab) => {
              // Check if this is a route-based tab or a state-based tab
              const isActive = tab.route ? pathname?.startsWith(tab.route) : activeTab === tab.id;

              return (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isActive={isActive}
                  isOpen={isOpen}
                  onTabClick={handleTabClick}
                  onMobileClose={closeSidebar}
                  badge={tab.id === 'followups' ? followUpBadgeCount : undefined}
                />
              );
            })}
          </div>

          {/* Profile Section at bottom */}
          <ProfileSection />
        </nav>
      </aside>
    </>
  );
}
