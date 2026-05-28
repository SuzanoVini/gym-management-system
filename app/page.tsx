'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/providers/ProtectedRoute';
import { SettingsProvider } from './components/providers/SettingsProvider';
import CancellationsTab from './components/tabs/CancellationsTab';
import FollowUpsTab from './components/tabs/FollowUpsTab';
import HoldsTab from './components/tabs/HoldsTab';
import InsightsTab from './components/tabs/InsightsTab';
import IntrosTab from './components/tabs/IntrosTab';
import MembersTab from './components/tabs/MembersTab';
import OverviewTab from './components/tabs/OverviewTab';
import SignupsTab from './components/tabs/SignupsTab';
import { useSidebarStore } from './store/useSidebarStore';

const VALID_TABS = [
  'overview',
  'insights',
  'intros',
  'followups',
  'signups',
  'cancellations',
  'holds',
  'members',
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'overview'
  );
  const { isOpen } = useSidebarStore();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/?tab=${tabId}`, { scroll: false });
  };

  return (
    <ProtectedRoute>
      <SettingsProvider>
        <div className="app-shell" data-sidebar={isOpen ? 'expanded' : 'collapsed'}>
          {/* Header Container */}
          <div>
            <Header onLogoClick={() => handleTabChange('overview')} />
          </div>

          {/* Sidebar Container */}
          <div>
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
          </div>

          {/* Main Content Container */}
          <div className="app-main">
            {/* Main Content Area */}
            <main className="py-6 sm:py-8">
              <div className="max-w-full">
                <div className="animate-fadeIn">
                  {activeTab === 'overview' && <OverviewTab />}
                  {activeTab === 'insights' && <InsightsTab />}
                  {activeTab === 'intros' && <IntrosTab />}
                  {activeTab === 'followups' && <FollowUpsTab />}
                  {activeTab === 'signups' && <SignupsTab />}
                  {activeTab === 'cancellations' && <CancellationsTab />}
                  {activeTab === 'holds' && <HoldsTab />}
                  {activeTab === 'members' && <MembersTab />}
                </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="bg-white/60 backdrop-blur-md border-t border-slate-200/60 mt-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <p className="text-center text-sm text-slate-600 font-medium">
                  &copy; {new Date().getFullYear()} Gracie Barra Kitsilano. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </SettingsProvider>
    </ProtectedRoute>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
