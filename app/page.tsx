'use client';

import { useState } from 'react';
import IntrosTab from './components/tabs/IntrosTab';
import SignupsTab from './components/tabs/SignupsTab';
// Import other tabs as we create them

export default function Home() {
  const [activeTab, setActiveTab] = useState('intros');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Gracie Barra Kitsilano</h1>
          <p className="text-sm text-gray-600 mt-1">Gym Management System</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('intros')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'intros'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Intros
            </button>
            <button
              onClick={() => setActiveTab('signups')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'signups'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sign-ups
            </button>
            <button
              onClick={() => setActiveTab('cancellations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cancellations'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cancellations
            </button>
            <button
              onClick={() => setActiveTab('holds')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'holds'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Holds
            </button>
            <button
              onClick={() => setActiveTab('followup')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'followup'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Follow-up
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <div>Overview Tab - Coming Soon</div>}
        {activeTab === 'intros' && <IntrosTab />}
        {activeTab === 'signups' && <SignupsTab />}
        {activeTab === 'cancellations' && <div>Cancellations Tab - Coming Soon</div>}
        {activeTab === 'holds' && <div>Holds Tab - Coming Soon</div>}
        {activeTab === 'followup' && <div>Follow-up Tab - Coming Soon</div>}
      </main>
    </div>
  );
}