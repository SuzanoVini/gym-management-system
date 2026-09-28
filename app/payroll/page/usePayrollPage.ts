import { useState } from 'react';
import { computeSuggestedNextPeriod } from '@/components/payroll/PeriodCreateModal';
import { usePayrollPeriod } from '@/hooks/usePayrollPeriod';
import { usePayrollStaff } from '@/hooks/usePayrollStaff';
import { useStaffHours } from '@/hooks/useStaffHours';
import { errorHandler } from '@/lib/errorHandler';
import { getPayrollPeriodForDate } from '@/lib/utils/date.utils';
import type { StaffMember } from '@/types';
import { exportPayrollPeriodCsv } from './exportPayroll';
import {
  createHoursHandlers,
  createImportHandlers,
  createPeriodHandlers,
  createStaffHandlers,
} from './payrollHandlers';

/** State, data hooks and handlers for the payroll page (hook call order matches the original page). */
export function usePayrollPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
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
  const suggestedNextPeriod = computeSuggestedNextPeriod(periods, getPayrollPeriodForDate);

  const {
    staff,
    loading: staffLoading,
    refresh: refreshStaff,
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

  const { handleSelectPeriod, handleCreatePeriod, handleSubmitNewPeriod, handleClosePeriod } =
    createPeriodHandlers({ switchToPeriod, addPeriod, finalizePeriod, setPeriodModalOpen });

  const { handleAddStaff, handleEditStaff, handleSubmitStaff, handleToggleActive } =
    createStaffHandlers({
      staff,
      selectedStaff,
      setSelectedStaff,
      setStaffModalOpen,
      addStaff,
      editStaff,
      removeStaff,
      activateStaff,
    });

  const { handleImport, handleQuickImport } = createImportHandlers({
    currentPeriod,
    staff,
    refreshStaff,
    refreshHours,
  });

  const { handleAddHours, handleDeleteHours, handleSubmitHours } = createHoursHandlers({
    currentPeriod,
    periodClosed,
    refreshHours,
    setHoursModalOpen,
  });

  // Export handlers
  const handleExport = async (periodId: string, _format: 'csv', formatId?: string) => {
    try {
      await exportPayrollPeriodCsv({ periods, staff, periodId, formatId });

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

  return {
    activeTab,
    setActiveTab,
    staffModalOpen,
    setStaffModalOpen,
    hoursModalOpen,
    setHoursModalOpen,
    periodModalOpen,
    setPeriodModalOpen,
    selectedStaff,
    setSelectedStaff,
    searchTerm,
    setSearchTerm,
    currentPeriod,
    periods,
    periodsLoading,
    periodClosed,
    suggestedNextPeriod,
    staff,
    staffLoading,
    hours,
    hoursLoading,
    updateHoursField,
    handleSelectPeriod,
    handleCreatePeriod,
    handleSubmitNewPeriod,
    handleClosePeriod,
    handleAddStaff,
    handleEditStaff,
    handleSubmitStaff,
    handleToggleActive,
    handleImport,
    handleQuickImport,
    handleAddHours,
    handleDeleteHours,
    handleSubmitHours,
    handleExport,
    summaryStats,
    isLoading,
  };
}
