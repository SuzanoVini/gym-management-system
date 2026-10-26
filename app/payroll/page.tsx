'use client';

import ExportTab from '@/components/payroll/ExportTab';
import ImportTab from '@/components/payroll/ImportTab';
import PeriodCreateModal from '@/components/payroll/PeriodCreateModal';
import PeriodHoursForm from '@/components/payroll/PeriodHoursForm';
import PeriodSelector from '@/components/payroll/PeriodSelector';
import StaffForm from '@/components/payroll/StaffForm';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import Modal from '@/components/ui/Modal';
import {
  HoursSummaryPanel,
  PayrollHeader,
  PayrollTabsNav,
  StaffManagementPanel,
} from './page/PayrollSections';
import { usePayrollPage } from './page/usePayrollPage';

export default function PayrollPage() {
  const payroll = usePayrollPage();

  return (
    <ProtectedRoute ownerOnly>
      <div className="payroll-page">
        <PayrollHeader />
        <div className="payroll-container">
          {/* Period Selector */}
          <div className="payroll-card">
            <PeriodSelector
              periods={payroll.periods}
              currentPeriod={payroll.currentPeriod}
              onSelectPeriod={(periodId) => {
                void payroll.handleSelectPeriod(periodId);
              }}
              onCreatePeriod={payroll.handleCreatePeriod}
              onClosePeriod={(periodId) => {
                void payroll.handleClosePeriod(periodId);
              }}
              loading={payroll.periodsLoading}
            />
          </div>

          {/* Tabs Navigation */}
          <PayrollTabsNav activeTab={payroll.activeTab} onTabChange={payroll.setActiveTab} />

          {/* Tab Content */}
          <div className="animate-fadeIn">
            {payroll.activeTab === 'import' && (
              <ImportTab
                onImport={payroll.handleImport}
                onQuickImport={payroll.handleQuickImport}
                staff={payroll.staff}
                loading={payroll.isLoading}
              />
            )}

            {payroll.activeTab === 'staff' && (
              <StaffManagementPanel
                staff={payroll.staff}
                staffLoading={payroll.staffLoading}
                searchTerm={payroll.searchTerm}
                onSearchTermChange={payroll.setSearchTerm}
                onAddStaff={payroll.handleAddStaff}
                onEditStaff={payroll.handleEditStaff}
                onToggleActive={payroll.handleToggleActive}
              />
            )}

            {payroll.activeTab === 'hours' && (
              <HoursSummaryPanel
                summaryStats={payroll.summaryStats}
                currentPeriod={payroll.currentPeriod}
                periodClosed={payroll.periodClosed}
                hours={payroll.hours}
                staff={payroll.staff}
                hoursLoading={payroll.hoursLoading}
                onAddHours={payroll.handleAddHours}
                onDeleteHours={payroll.handleDeleteHours}
                onUpdateHours={payroll.updateHoursField}
              />
            )}

            {payroll.activeTab === 'export' && (
              <ExportTab
                periods={payroll.periods}
                currentPeriod={payroll.currentPeriod}
                onExport={payroll.handleExport}
                loading={payroll.isLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* Staff Form Modal */}
      <Modal
        isOpen={payroll.staffModalOpen}
        onClose={() => {
          payroll.setStaffModalOpen(false);
          payroll.setSelectedStaff(null);
        }}
        title={payroll.selectedStaff ? 'Edit Staff Member' : 'Add Staff Member'}
      >
        <StaffForm
          staff={payroll.selectedStaff}
          onSubmit={(data) => {
            void payroll.handleSubmitStaff(data);
          }}
          loading={payroll.staffLoading}
          onCancel={() => {
            payroll.setStaffModalOpen(false);
            payroll.setSelectedStaff(null);
          }}
        />
      </Modal>

      {/* Hours Form Modal */}
      <Modal
        isOpen={payroll.hoursModalOpen}
        onClose={() => payroll.setHoursModalOpen(false)}
        title="Add Hours for Period"
        size="lg"
      >
        <PeriodHoursForm
          staff={payroll.staff}
          onSubmit={(staffId, data) => {
            void payroll.handleSubmitHours(staffId, data);
          }}
          loading={payroll.hoursLoading}
          onCancel={() => payroll.setHoursModalOpen(false)}
        />
      </Modal>

      {/* Create Period Modal */}
      <Modal
        isOpen={payroll.periodModalOpen}
        onClose={() => payroll.setPeriodModalOpen(false)}
        title="Create Payroll Period"
      >
        <PeriodCreateModal
          suggestedStartDate={payroll.suggestedNextPeriod.startDate}
          suggestedEndDate={payroll.suggestedNextPeriod.endDate}
          existingPeriods={payroll.periods}
          onSubmit={payroll.handleSubmitNewPeriod}
          onCancel={() => payroll.setPeriodModalOpen(false)}
          loading={payroll.periodsLoading}
        />
      </Modal>
    </ProtectedRoute>
  );
}
