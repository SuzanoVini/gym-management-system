'use client';

import { TrendingUp, Users, MessageSquare, UserCheck, UserX, Clock } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'intros', label: 'Intros', icon: Users },
  { id: 'followup', label: 'Follow-up', icon: MessageSquare },
  { id: 'signups', label: 'Sign-ups', icon: UserCheck },
  { id: 'cancellations', label: 'Cancellations', icon: UserX },
  { id: 'holds', label: 'Holds', icon: Clock },
];

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-4 border-b-3 font-medium text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}