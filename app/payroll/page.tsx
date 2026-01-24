'use client';

import { Calendar, Clock, FileDown, FileUp, Plus, Users } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payroll Management</h1>
            <p className="text-gray-600">Manage staff hours and payroll processing</p>
          </div>

          {/* Period Selector */}
          <div className="section-container mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-red-50 rounded-lg">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">Payroll Period</p>
                <div className="mt-2">
                  <PeriodSelector
                    periods={periods}
                    currentPeriod={currentPeriod}
                    onSelectPeriod={handleSelectPeriod}
                    onCreatePeriod={handleCreatePeriod}
                    loading={periodsLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="section-container mb-6">
            <div className="border-b border-gray-200">
              <nav
                className="-mb-px flex gap-2 sm:gap-4 overflow-x-auto scrollbar-thin"
                aria-label="Tabs"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className={`flex items-center gap-2 whitespace-nowrap py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'import'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  Import Data
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className={`flex items-center gap-2 whitespace-nowrap py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'staff'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Staff Management
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hours')}
                  className={`flex items-center gap-2 whitespace-nowrap py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'hours'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Hours Summary
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className={`flex items-center gap-2 whitespace-nowrap py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'export'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  Export
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-fadeIn">
            {activeTab === 'import' && <ImportTab onImport={handleImport} loading={isLoading} />}

            {activeTab === 'staff' && (
              <div className="section-container">
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
              <div className="section-container">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Hours Summary</h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Staff Members</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {summaryStats.staffCount}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Regular Hours</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {summaryStats.regularHours.toFixed(1)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Overtime Hours</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {summaryStats.overtimeHours.toFixed(1)}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <Clock className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                  <div className="card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Total Hours</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {summaryStats.totalHours.toFixed(1)}
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <Clock className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payroll Table */}
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
                  />
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Please select a payroll period</p>
                  </div>
                )}
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
