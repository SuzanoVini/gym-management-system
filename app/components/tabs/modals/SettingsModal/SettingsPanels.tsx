import type { SettingsTab } from './useSettingsModalState';

export function SettingsTabBar({
  activeTab,
  onSelect,
  scope,
}: {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  scope: string | undefined;
}) {
  return (
    <div className="flex space-x-1 mb-6 border-b border-gray-200">
      <button
        type="button"
        onClick={() => onSelect('classes')}
        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
          activeTab === 'classes'
            ? 'border-red-600 text-red-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Class Types
      </button>
      <button
        type="button"
        onClick={() => onSelect('staff')}
        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
          activeTab === 'staff'
            ? 'border-red-600 text-red-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Staff Members
      </button>
      <button
        type="button"
        onClick={() => onSelect('revenue')}
        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
          activeTab === 'revenue'
            ? 'border-red-600 text-red-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Revenue
      </button>
      {scope && (
        <button
          type="button"
          onClick={() => onSelect('filters')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'filters'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Default Filters
        </button>
      )}
    </div>
  );
}

export function RevenuePanel({
  revenueInput,
  onRevenueInputChange,
  isOwner,
  revenueSaving,
  onSave,
}: {
  revenueInput: string;
  onRevenueInputChange: (value: string) => void;
  isOwner: boolean;
  revenueSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Average monthly revenue per member — used to estimate the dollar impact shown on Insights
        cards.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">$</span>
        <input
          type="number"
          min="0"
          step="1"
          value={revenueInput}
          onChange={(e) => onRevenueInputChange(e.target.value)}
          disabled={!isOwner}
          className="form-input w-32"
        />
        <span className="text-sm text-gray-500">/month</span>
        {isOwner && (
          <button
            type="button"
            onClick={onSave}
            disabled={revenueSaving}
            className="btn btn-primary ml-2"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
