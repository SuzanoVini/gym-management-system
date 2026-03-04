'use client';

import { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/providers/ProtectedRoute';
import CancellationsTab from './components/tabs/CancellationsTab';
import HoldsTab from './components/tabs/HoldsTab';
import InsightsTab from './components/tabs/InsightsTab';
import IntrosTab from './components/tabs/IntrosTab';
import OverviewTab from './components/tabs/OverviewTab';
import SignupsTab from './components/tabs/SignupsTab';
import { useSidebarStore } from './store/useSidebarStore';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const { isOpen } = useSidebarStore();

  return (
    <ProtectedRoute>
      <div className="app-shell" data-sidebar={isOpen ? 'expanded' : 'collapsed'}>
        {/* Header Container */}
        <div>
          <Header onLogoClick={() => setActiveTab('overview')} />
        </div>

        {/* Sidebar Container */}
        <div>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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
                {activeTab === 'signups' && <SignupsTab />}
                {activeTab === 'cancellations' && <CancellationsTab />}
                {activeTab === 'holds' && <HoldsTab />}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white/60 backdrop-blur-md border-t border-slate-200/60 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <p className="text-center text-sm text-slate-600 font-medium">
                © {new Date().getFullYear()} Gracie Barra Kitsilano. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ProtectedRoute>
  );
}
