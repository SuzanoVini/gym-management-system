import type { usePayrollPeriod } from '@/hooks/usePayrollPeriod';
import type { usePayrollStaff } from '@/hooks/usePayrollStaff';
import type { useStaffHours } from '@/hooks/useStaffHours';
import { errorHandler } from '@/lib/errorHandler';
import { formatQuickImportSummary, parseQuickImport } from '@/lib/quick-import';
import {
  deleteStaffHours,
  saveQuickImportEntries,
  setManualHours,
} from '@/lib/services/hours.service';
import {
  saveHoursRows,
  saveStaffRows,
  validateHoursCSV,
  validateStaffCSV,
} from '@/lib/services/import.service';
import type { PayrollPeriod, StaffHoursFormData, StaffMember, StaffMemberFormData } from '@/types';

type PeriodApi = ReturnType<typeof usePayrollPeriod>;
type StaffApi = ReturnType<typeof usePayrollStaff>;
type HoursApi = ReturnType<typeof useStaffHours>;

// Period handlers
export function createPeriodHandlers({
  switchToPeriod,
  addPeriod,
  finalizePeriod,
  setPeriodModalOpen,
}: Pick<PeriodApi, 'switchToPeriod' | 'addPeriod' | 'finalizePeriod'> & {
  setPeriodModalOpen: (open: boolean) => void;
}) {
  const handleSelectPeriod = async (periodId: string) => {
    if (periodId) {
      await switchToPeriod(periodId);
    }
  };

  const handleCreatePeriod = () => {
    setPeriodModalOpen(true);
  };

  const handleSubmitNewPeriod = async (startDate: string, endDate: string) => {
    try {
      await addPeriod(startDate, endDate);
      setPeriodModalOpen(false);
    } catch (err) {
      errorHandler.handle(err, 'handleSubmitNewPeriod');
    }
  };

  const handleClosePeriod = async (periodId: string) => {
    try {
      await finalizePeriod(periodId);
    } catch (err) {
      errorHandler.handle(err, 'handleClosePeriod');
    }
  };

  return { handleSelectPeriod, handleCreatePeriod, handleSubmitNewPeriod, handleClosePeriod };
}

// Staff handlers
export function createStaffHandlers({
  staff,
  selectedStaff,
  setSelectedStaff,
  setStaffModalOpen,
  addStaff,
  editStaff,
  removeStaff,
  activateStaff,
}: Pick<StaffApi, 'staff' | 'addStaff' | 'editStaff' | 'removeStaff' | 'activateStaff'> & {
  selectedStaff: StaffMember | null;
  setSelectedStaff: (staff: StaffMember | null) => void;
  setStaffModalOpen: (open: boolean) => void;
}) {
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

  return { handleAddStaff, handleEditStaff, handleSubmitStaff, handleToggleActive };
}

// Import handlers
export function createImportHandlers({
  currentPeriod,
  staff,
  refreshStaff,
  refreshHours,
}: {
  currentPeriod: PayrollPeriod | null;
  staff: StaffMember[];
  refreshStaff: StaffApi['refresh'];
  refreshHours: HoursApi['refresh'];
}) {
  // Validate the whole file first, then save; returns the message shown to the user.
  const importStaffFile = async (file: File): Promise<string> => {
    const validated = await validateStaffCSV(file);
    if (!validated.success) {
      throw new Error(validated.errors.join('\n'));
    }
    const saved = await saveStaffRows(validated.rows);
    if (!saved.success) {
      throw new Error(saved.errors.join('\n'));
    }
    await refreshStaff();
    return `Imported ${saved.imported} staff members`;
  };

  const importHoursFile = async (file: File): Promise<string> => {
    if (!currentPeriod) {
      throw new Error('Please select a payroll period first');
    }
    const validated = await validateHoursCSV(file, currentPeriod.id);
    if (!validated.success) {
      throw new Error(validated.errors.join('\n'));
    }
    const saved = await saveHoursRows(currentPeriod, validated.rows);
    await refreshHours();
    if (!saved.success) {
      throw new Error(saved.errors.join('\n'));
    }
    const skipped = saved.skipped > 0 ? ` (${saved.skipped} already imported, skipped)` : '';
    return `Imported ${saved.imported} hour entries into ${currentPeriod.period_label}${skipped}`;
  };

  const handleImport = async (file: File, type: 'staff' | 'hours'): Promise<string> => {
    try {
      const message = await (type === 'staff' ? importStaffFile(file) : importHoursFile(file));
      errorHandler.notify(message, 'success');
      return message;
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

  return { handleImport, handleQuickImport };
}

// Hours management handlers
export function createHoursHandlers({
  currentPeriod,
  periodClosed,
  refreshHours,
  setHoursModalOpen,
}: {
  currentPeriod: PayrollPeriod | null;
  periodClosed: boolean;
  refreshHours: HoursApi['refresh'];
  setHoursModalOpen: (open: boolean) => void;
}) {
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

  return { handleAddHours, handleDeleteHours, handleSubmitHours };
}
