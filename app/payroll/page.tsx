'use client';

import { Calendar, Clock, FileDown, FileUp, Plus, Users } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import ExportTab from '@/components/payroll/ExportTab';
import ImportTab from '@/components/payroll/ImportTab';
import PayrollTable from '@/components/payroll/PayrollTable';
import PeriodSelector from '@/components/payroll/PeriodSelector';
import StaffForm from '@/components/payroll/StaffForm';
import StaffTable from '@/components/payroll/StaffTable';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import Modal from '@/components/ui/Modal';
import { usePayrollPeriod } from '@/hooks/usePayrollPeriod';
import { usePayrollStaff } from '@/hooks/usePayrollStaff';
import { useStaffHours } from '@/hooks/useStaffHours';
import { errorHandler } from '@/lib/errorHandler';
import { formatQuickImportSummary, parseQuickImport } from '@/lib/quick-import';
import { importHoursCSV, importStaffCSV } from '@/lib/services/import.service';
import type { StaffMember, StaffMemberFormData } from '@/types';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Hooks
  const {
    currentPeriod,
    periods,
    loading: periodsLoading,
    switchToPeriod,
    addPeriod,
  } = usePayrollPeriod();

  const {
    staff,
    loading: staffLoading,
    addStaff,
    editStaff,
    removeStaff,
    activateStaff,
  } = usePayrollStaff(false); // Get all staff (active and inactive)

  const {
    hours,
    loading: hoursLoading,
    refresh: refreshHours,
    updateHoursField,
  } = useStaffHours(currentPeriod?.id || null);

  // Period handlers
  const handleSelectPeriod = async (periodId: string) => {
    if (periodId) {
      await switchToPeriod(periodId);
    }
  };

  const handleCreatePeriod = async () => {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const endDate = prompt('Enter end date (YYYY-MM-DD):');

    if (startDate && endDate) {
      try {
        await addPeriod(startDate, endDate);
      } catch (err) {
        errorHandler.handle(err, 'handleCreatePeriod');
      }
    }
  };

  // Staff handlers
  const handleAddStaff = () => {
    setSelectedStaff(null);
    setStaffModalOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setStaffModalOpen(true);
  };

  const handleSubmitStaff = async (data: StaffMemberFormData) => {
    try {
      if (selectedStaff) {
        await editStaff(selectedStaff.id, data);
      } else {
        await addStaff(data);
      }
      setStaffModalOpen(false);
      setSelectedStaff(null);
    } catch (err) {
      errorHandler.handle(err, 'handleSubmitStaff');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const staffMember = staff.find((s) => s.id === id);
    if (!staffMember) {
      return;
    }

    try {
      if (isActive) {
        await activateStaff(id, staffMember.full_name);
      } else {
        await removeStaff(id, staffMember.full_name);
      }
    } catch (err) {
      errorHandler.handle(err, 'handleToggleActive');
    }
  };

  // Import handlers
  const handleImport = async (file: File, type: 'staff' | 'hours') => {
    try {
      if (type === 'staff') {
        const result = await importStaffCSV(file);
        if (result.success) {
          errorHandler.notify(`Successfully imported ${result.imported} staff members`, 'success');
          // Refresh staff list (would need a refresh method from staff service)
        } else {
          throw new Error(result.errors.join('\n'));
        }
      } else {
        if (!currentPeriod) {
          throw new Error('Please select a payroll period first');
        }
        const result = await importHoursCSV(file, currentPeriod.id);
        if (result.success) {
          errorHandler.notify(`Successfully imported ${result.imported} hour entries`, 'success');
          await refreshHours();
        } else {
          throw new Error(result.errors.join('\n'));
        }
      }
    } catch (err) {
      errorHandler.handle(err, 'handleImport');
      throw err;
    }
  };

  // Quick text import handler
  const handleQuickImport = async (staffId: string, textData: string) => {
    if (!currentPeriod) {
      throw new Error('Please select a payroll period first');
    }

    // Parse the quick import text
    const summary = parseQuickImport(textData);

    if (summary.errors.length > 0) {
      throw new Error(summary.errors.join('\n'));
    }

    if (summary.entries.length === 0) {
      throw new Error('No valid entries found to import');
    }

    // Find the staff member
    const staffMember = staff.find((s) => s.id === staffId);
    if (!staffMember) {
      throw new Error('Staff member not found');
    }

    // Import is not yet implemented - just show success for now
    const message = formatQuickImportSummary(summary, staffMember.full_name);
    errorHandler.notify(message, 'success');

    // TODO: Implement actual database save using hooks
    // For now, just refresh to show the message
    await refreshHours();
  };

  // Export handlers
  const handleExport = async (periodId: string, _format: 'csv') => {
    try {
      const period = periods.find((p) => p.id === periodId);
      if (!period) {
        throw new Error('Period not found');
      }

      // Get hours for the selected period
      const periodHours = hours.filter((h) => h.period_id === periodId);

      // Create CSV content
      const headers = [
        'Staff Name',
        'Payroll ID',
        'Regular Hours',
        'Overtime Hours',
        'Vacation Hours',
        'Mat Cleaning Count',
        'Total Hours',
      ];

      const rows = periodHours.map((h) => {
        const staffMember = staff.find((s) => s.id === h.staff_id);
        return [
          staffMember?.full_name || 'Unknown',
          staffMember?.employee_id || '',
          h.regular_hours.toFixed(2),
          h.overtime_hours.toFixed(2),
          h.vacation_hours.toFixed(2),
          h.mat_cleaning_count.toString(),
          h.total_hours.toFixed(2),
        ];
      });

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payroll_${period.period_label.replace(/\//g, '-')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      errorHandler.notify('Export completed successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'handleExport');
      throw err;
    }
  };

  // Calculate summary stats
  const summaryStats = {
    staffCount: staff.filter((s) => s.is_active).length,
    regularHours: hours.reduce((sum, h) => sum + h.regular_hours, 0),
    overtimeHours: hours.reduce((sum, h) => sum + h.overtime_hours, 0),
    totalHours: hours.reduce((sum, h) => sum + h.total_hours, 0),
  };

  const isLoading = periodsLoading || staffLoading || hoursLoading;

  return (
    <ProtectedRoute>
      <div className="payroll-page">
        <div className="payroll-container">
          {/* Header */}
          <div className="payroll-header">
            <Image
              src="/logo-payroll.png"
              alt="Gracie Barra Kitsilano Logo"
              width={80}
              height={80}
              className="drop-shadow-[2px_2px_4px_rgba(0,0,0,0.3)]"
              priority
            />
            <div>
              <h1 className="text-4xl font-bold text-white m-0 drop-shadow-lg">
                Gracie Barra Kitsilano
              </h1>
              <p className="text-xl text-white/90 mt-1 mb-0">Staff Payroll Management System</p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="payroll-card">
            <PeriodSelector
              periods={periods}
              currentPeriod={currentPeriod}
              onSelectPeriod={handleSelectPeriod}
              onCreatePeriod={handleCreatePeriod}
              loading={periodsLoading}
            />
          </div>

          {/* Tabs Navigation */}
          <div className="payroll-card mb-6">
            <div className="payroll-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`payroll-tab ${activeTab === 'import' ? 'active' : ''}`}
              >
                <FileUp className="w-4 h-4" />
                Import Data
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`payroll-tab ${activeTab === 'staff' ? 'active' : ''}`}
              >
                <Users className="w-4 h-4" />
                Staff Management
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hours')}
                className={`payroll-tab ${activeTab === 'hours' ? 'active' : ''}`}
              >
                <Clock className="w-4 h-4" />
                Hours Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`payroll-tab ${activeTab === 'export' ? 'active' : ''}`}
              >
                <FileDown className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-fadeIn">
            {activeTab === 'import' && (
              <ImportTab
                onImport={handleImport}
                onQuickImport={handleQuickImport}
                staff={staff}
                loading={isLoading}
              />
            )}

            {activeTab === 'staff' && (
              <div className="payroll-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Staff Management</h2>
                  <button type="button" onClick={handleAddStaff} className="btn btn-primary">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input w-full"
                  />
                </div>

                <StaffTable
                  staff={staff}
                  loading={staffLoading}
                  onEdit={handleEditStaff}
                  onToggleActive={handleToggleActive}
                  searchTerm={searchTerm}
                  filterStatus="all"
                />
              </div>
            )}

            {activeTab === 'hours' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="payroll-summary-cards">
                  <div className="payroll-summary-card">
                    <h3 className="text-3xl font-bold mb-1">{summaryStats.staffCount}</h3>
                    <p className="text-sm opacity-90">Staff Members</p>
                  </div>
                  <div className="payroll-summary-card">
                    <h3 className="text-3xl font-bold mb-1">
                      {summaryStats.regularHours.toFixed(1)}
                    </h3>
                    <p className="text-sm opacity-90">Regular Hours</p>
                  </div>
                  <div className="payroll-summary-card">
                    <h3 className="text-3xl font-bold mb-1">
                      {summaryStats.overtimeHours.toFixed(1)}
                    </h3>
                    <p className="text-sm opacity-90">Overtime Hours</p>
                  </div>
                  <div className="payroll-summary-card">
                    <h3 className="text-3xl font-bold mb-1">
                      {summaryStats.totalHours.toFixed(1)}
                    </h3>
                    <p className="text-sm opacity-90">Total Hours</p>
                  </div>
                </div>

                {/* Payroll Table */}
                <div className="payroll-card">
                  {currentPeriod ? (
                    <PayrollTable
                      hours={hours}
                      staff={staff}
                      loading={hoursLoading}
                      onEdit={() => {
                        /* TODO: Implement edit hours functionality */
                      }}
                      onDelete={() => {
                        /* TODO: Implement delete hours functionality */
                      }}
                      onUpdateHours={updateHoursField}
                    />
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Please select a payroll period</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <ExportTab
                periods={periods}
                currentPeriod={currentPeriod}
                onExport={handleExport}
                loading={isLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* Staff Form Modal */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => {
          setStaffModalOpen(false);
          setSelectedStaff(null);
        }}
        title={selectedStaff ? 'Edit Staff Member' : 'Add Staff Member'}
      >
        <StaffForm
          staff={selectedStaff}
          onSubmit={handleSubmitStaff}
          loading={staffLoading}
          onCancel={() => {
            setStaffModalOpen(false);
            setSelectedStaff(null);
          }}
        />
      </Modal>
    </ProtectedRoute>
  );
}
