'use client';

import { Calendar, Clock, FileDown, FileUp, Plus, Users } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import ExportTab from '@/components/payroll/ExportTab';
import ImportTab from '@/components/payroll/ImportTab';
import PayrollTable from '@/components/payroll/PayrollTable';
import PeriodHoursForm from '@/components/payroll/PeriodHoursForm';
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
import {
  deleteStaffHours,
  getHoursForPeriod,
  saveQuickImportEntries,
  setManualHours,
} from '@/lib/services/hours.service';
import { importHoursCSV, importStaffCSV } from '@/lib/services/import.service';
import { parseDate } from '@/lib/utils/date.utils';
import { escapeCsvValue } from '@/lib/utils/export.utils';
import type { StaffHoursFormData, StaffMember, StaffMemberFormData } from '@/types';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Hooks
  const {
    currentPeriod,
    periods,
    loading: periodsLoading,
    switchToPeriod,
    addPeriod,
    finalizePeriod,
  } = usePayrollPeriod();
  const periodClosed = currentPeriod?.is_closed ?? false;

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

  const handleClosePeriod = async (periodId: string) => {
    try {
      await finalizePeriod(periodId);
    } catch (err) {
      errorHandler.handle(err, 'handleClosePeriod');
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
    if (currentPeriod.is_closed) {
      throw new Error('This payroll period is closed and cannot be modified');
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

    await saveQuickImportEntries(
      currentPeriod.id,
      staffId,
      currentPeriod.start_date,
      summary.entries
    );

    const message = formatQuickImportSummary(summary, staffMember.full_name);
    errorHandler.notify(message, 'success');
    await refreshHours();
  };

  // Hours management handlers
  const handleAddHours = () => {
    setHoursModalOpen(true);
  };

  const handleDeleteHours = async (staffHoursId: string) => {
    if (periodClosed) {
      errorHandler.handle(
        new Error('This payroll period is closed and cannot be modified'),
        'handleDeleteHours'
      );
      return;
    }
    try {
      await deleteStaffHours(staffHoursId);
      errorHandler.notify('Hours deleted', 'success');
      await refreshHours();
    } catch (err) {
      errorHandler.handle(err, 'handleDeleteHours');
    }
  };

  const handleSubmitHours = async (staffId: string, data: Partial<StaffHoursFormData>) => {
    if (!currentPeriod) {
      errorHandler.handle(new Error('Please select a payroll period first'), 'handleSubmitHours');
      return;
    }
    if (currentPeriod.is_closed) {
      errorHandler.handle(
        new Error('This payroll period is closed and cannot be modified'),
        'handleSubmitHours'
      );
      return;
    }

    try {
      await setManualHours(currentPeriod.id, staffId, data);

      errorHandler.notify('Hours saved successfully', 'success');
      setHoursModalOpen(false);
      await refreshHours();
    } catch (err) {
      errorHandler.handle(err, 'handleSubmitHours');
    }
  };

  // Export handlers
  const handleExport = async (periodId: string, _format: 'csv', formatId?: string) => {
    try {
      const period = periods.find((p) => p.id === periodId);
      if (!period) {
        throw new Error('Period not found');
      }

      // Get format configuration
      let formatConfig = null;
      if (formatId) {
        const { getFormatById } = await import('@/lib/services/csv-format.service');
        const result = await getFormatById(formatId);
        if (result.error) {
          throw result.error;
        }
        formatConfig = result.data;
      }

      // Fetch hours for the selected period — in-memory hours only cover the
      // current period, so exporting any other period needs its own query
      let periodHours = await getHoursForPeriod(periodId);

      // Apply staff ordering based on format configuration
      if (formatConfig?.staff_order_config) {
        const { type, direction } = formatConfig.staff_order_config;

        periodHours = [...periodHours].sort((a, b) => {
          const staffA = staff.find((s) => s.id === a.staff_id);
          const staffB = staff.find((s) => s.id === b.staff_id);

          const compareValue =
            type === 'name'
              ? (staffA?.full_name || '').localeCompare(staffB?.full_name || '')
              : (staffA?.employee_id || '').localeCompare(staffB?.employee_id || '');

          return direction === 'asc' ? compareValue : -compareValue;
        });
      }

      // Build CSV based on format configuration
      let headers: string[];
      let rowBuilder: (h: (typeof periodHours)[0], s: (typeof staff)[0] | undefined) => string[];

      if (formatConfig?.column_config) {
        // Use format configuration
        const enabledColumns = formatConfig.column_config.filter((col) => col.enabled);
        headers = enabledColumns.map((col) => col.label);

        rowBuilder = (h, staffMember) => {
          // Split full name into first and last name
          const fullName = staffMember?.full_name || 'Unknown';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          return enabledColumns.map((col) => {
            switch (col.key) {
              case 'staff_name':
                return fullName;
              case 'employee_id':
                return staffMember?.employee_id || '';
              case 'first_name':
                return firstName;
              case 'last_name':
                return lastName;
              case 'job_id':
                return ''; // Not stored in database, leave empty
              case 'department_name':
                return ''; // Not stored in database, leave empty
              case 'overtime_hours':
                return h.overtime_hours.toFixed(2);
              case 'regular_hours':
                return h.regular_hours.toFixed(2);
              case 'sick_hours':
                return h.sick_hours.toFixed(2);
              case 'vacation_hours':
                return h.vacation_hours.toFixed(2);
              case 'external_id':
                return ''; // Not stored in database, leave empty
              case 'job_title':
                return ''; // Not stored in database, leave empty
              default:
                return '';
            }
          });
        };
      } else {
        // Default format matching accountant template
        headers = [
          'Employee name',
          'Employee payroll ID',
          'First name',
          'Last name',
          'job id',
          'Department name',
          'Overtime',
          'Regular Pay',
          'Sick Pay',
          'Vacation Pay',
          'External ID',
          'Job Title',
        ];

        rowBuilder = (h, staffMember) => {
          const fullName = staffMember?.full_name || 'Unknown';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          return [
            fullName,
            staffMember?.employee_id || '',
            firstName,
            lastName,
            '', // job id - not stored
            '', // Department name - not stored
            h.overtime_hours.toFixed(2),
            h.regular_hours.toFixed(2),
            h.sick_hours.toFixed(2),
            h.vacation_hours.toFixed(2),
            '', // External ID - not stored
            '', // Job Title - not stored
          ];
        };
      }

      const rows = periodHours.map((h) => {
        const staffMember = staff.find((s) => s.id === h.staff_id);
        return rowBuilder(h, staffMember);
      });

      // Format dates for the header (mm/dd/yyyy); parseDate avoids the UTC
      // day-shift of new Date('YYYY-MM-DD')
      const formatDate = (dateStr: string) => {
        const date = parseDate(dateStr);
        if (!date) {
          return dateStr;
        }
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      };

      const dateRange = `${formatDate(period.start_date)}-${formatDate(period.end_date)}`;

      // Build CSV with exact accountant template structure:
      // Row 1: "Summary Report - Kitsilano Brazilian Jiu Jitsu Inc."
      // Row 2: Date range
      // Row 3: Blank
      // Row 4: Column headers
      // Row 5+: Data rows
      const csvLines = [
        ['Summary Report - Kitsilano Brazilian Jiu Jitsu Inc.'],
        [dateRange],
        [], // Blank row
        headers,
        ...rows,
      ];

      const csvContent = csvLines
        .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
        .join('\n');

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
              <h1
                className="text-4xl font-bold m-0"
                style={{ color: 'white', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
              >
                Gracie Barra Kitsilano
              </h1>
              <p
                className="text-xl mt-1 mb-0"
                style={{ color: 'white', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
              >
                Staff Payroll Management System
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="payroll-card">
            <PeriodSelector
              periods={periods}
              currentPeriod={currentPeriod}
              onSelectPeriod={handleSelectPeriod}
              onCreatePeriod={handleCreatePeriod}
              onClosePeriod={handleClosePeriod}
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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Hours Summary</h2>
                    {currentPeriod && !periodClosed && (
                      <button type="button" onClick={handleAddHours} className="btn btn-primary">
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
                      onDelete={handleDeleteHours}
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

      {/* Hours Form Modal */}
      <Modal
        isOpen={hoursModalOpen}
        onClose={() => setHoursModalOpen(false)}
        title="Add Hours for Period"
        size="lg"
      >
        <PeriodHoursForm
          staff={staff}
          onSubmit={handleSubmitHours}
          loading={hoursLoading}
          onCancel={() => setHoursModalOpen(false)}
        />
      </Modal>
    </ProtectedRoute>
  );
}
