import { Calendar, Clock, FileDown, FileUp, Plus, Users } from 'lucide-react';
import Image from 'next/image';
import type { ComponentProps } from 'react';
import PayrollTable from '@/components/payroll/PayrollTable';
import StaffTable from '@/components/payroll/StaffTable';
import InfoTip from '@/components/ui/InfoTip';
import { brand } from '@/lib/brand';
import type { PayrollPeriod, StaffHours, StaffMember } from '@/types';

export function PayrollHeader() {
  return (
    <div className="payroll-header">
      <div className="flex items-center gap-3">
        {brand.badgeUrl && (
          <Image
            src={brand.badgeUrl}
            alt={`${brand.name} logo`}
            width={40}
            height={40}
            unoptimized
            priority
          />
        )}
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">{brand.name} staff hours by pay period</p>
        </div>
      </div>
    </div>
  );
}

export function PayrollTabsNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="payroll-tabs">
        <button
          type="button"
          onClick={() => onTabChange('import')}
          className={`payroll-tab ${activeTab === 'import' ? 'active' : ''}`}
        >
          <FileUp className="w-4 h-4" />
          Import Data
        </button>
        <button
          type="button"
          onClick={() => onTabChange('staff')}
          className={`payroll-tab ${activeTab === 'staff' ? 'active' : ''}`}
        >
          <Users className="w-4 h-4" />
          Staff Management
        </button>
        <button
          type="button"
          onClick={() => onTabChange('hours')}
          className={`payroll-tab ${activeTab === 'hours' ? 'active' : ''}`}
        >
          <Clock className="w-4 h-4" />
          Hours Summary
        </button>
        <button
          type="button"
          onClick={() => onTabChange('export')}
          className={`payroll-tab ${activeTab === 'export' ? 'active' : ''}`}
        >
          <FileDown className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
}

interface StaffManagementPanelProps {
  staff: StaffMember[];
  staffLoading: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export function StaffManagementPanel({
  staff,
  staffLoading,
  searchTerm,
  onSearchTermChange,
  onAddStaff,
  onEditStaff,
  onToggleActive,
}: StaffManagementPanelProps) {
  return (
    <div className="payroll-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Staff Management</h2>
        <button type="button" onClick={onAddStaff} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search staff by name, ID, or title..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="form-input w-full"
        />
      </div>

      <StaffTable
        staff={staff}
        loading={staffLoading}
        onEdit={onEditStaff}
        onToggleActive={(id, isActive) => {
          void onToggleActive(id, isActive);
        }}
        searchTerm={searchTerm}
        filterStatus="all"
      />
    </div>
  );
}

export interface PayrollSummaryStats {
  staffCount: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
}

interface HoursSummaryPanelProps {
  summaryStats: PayrollSummaryStats;
  currentPeriod: PayrollPeriod | null;
  periodClosed: boolean;
  hours: StaffHours[];
  staff: StaffMember[];
  hoursLoading: boolean;
  onAddHours: () => void;
  onDeleteHours: (staffHoursId: string) => Promise<void>;
  onUpdateHours: NonNullable<ComponentProps<typeof PayrollTable>['onUpdateHours']>;
}

export function HoursSummaryPanel({
  summaryStats,
  currentPeriod,
  periodClosed,
  hours,
  staff,
  hoursLoading,
  onAddHours,
  onDeleteHours,
  onUpdateHours,
}: HoursSummaryPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="payroll-summary-cards">
        <div className="payroll-summary-card">
          <h3>{summaryStats.staffCount}</h3>
          <p className="text-sm opacity-90 flex items-center justify-center gap-1.5">
            Staff Members
            <InfoTip label="Every staff member currently marked active, whether or not they logged hours this period. Deactivated staff are excluded but keep their past payroll records." />
          </p>
        </div>
        <div className="payroll-summary-card">
          <h3>{summaryStats.regularHours.toFixed(1)}</h3>
          <p className="text-sm opacity-90 flex items-center justify-center gap-1.5">
            Regular Hours
            <InfoTip label="Hours logged as regular across all staff for the selected pay period. Overtime, vacation, sick and mat cleaning are tracked separately and are not included here." />
          </p>
        </div>
        <div className="payroll-summary-card">
          <h3>{summaryStats.overtimeHours.toFixed(1)}</h3>
          <p className="text-sm opacity-90 flex items-center justify-center gap-1.5">
            Overtime Hours
            <InfoTip label="Hours logged specifically as overtime. Overtime is entered by hand rather than derived from a weekly threshold, so it reflects what was actually approved." />
          </p>
        </div>
        <div className="payroll-summary-card">
          <h3>{summaryStats.totalHours.toFixed(1)}</h3>
          <p className="text-sm opacity-90 flex items-center justify-center gap-1.5">
            Total Hours
            <InfoTip label="Every hour entry for the period added together — regular, overtime, vacation, sick and mat cleaning. It is deliberately more than Regular plus Overtime, because paid leave and mat cleaning count toward pay." />
          </p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="payroll-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Hours Summary</h2>
          {currentPeriod && !periodClosed && (
            <button type="button" onClick={onAddHours} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Hours
            </button>
          )}
        </div>

        {currentPeriod ? (
          <PayrollTable
            hours={hours}
            staff={staff}
            loading={hoursLoading}
            readOnly={periodClosed}
            onDelete={(id) => {
              void onDeleteHours(id);
            }}
            onUpdateHours={onUpdateHours}
          />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Please select a payroll period</p>
          </div>
        )}
      </div>
    </div>
  );
}
