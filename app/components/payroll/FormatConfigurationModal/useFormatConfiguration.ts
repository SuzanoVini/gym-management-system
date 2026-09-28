import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import {
  createFormat,
  deleteFormat,
  getAllFormats,
  updateFormat,
} from '@/lib/services/csv-format.service';
import type {
  CSVColumnConfig,
  CSVExportFormat,
  CSVExportFormatFormData,
  CSVStaffOrderConfig,
} from '@/types';

// Default column configuration matching accountant template.
// Built fresh on each call because column edits mutate the column objects.
function buildDefaultColumns(): CSVColumnConfig[] {
  return [
    { key: 'staff_name', label: 'Employee name', enabled: true },
    { key: 'employee_id', label: 'Employee payroll ID', enabled: true },
    { key: 'first_name', label: 'First name', enabled: true },
    { key: 'last_name', label: 'Last name', enabled: true },
    { key: 'job_id', label: 'job id', enabled: true },
    { key: 'department_name', label: 'Department name', enabled: true },
    { key: 'overtime_hours', label: 'Overtime', enabled: true },
    { key: 'regular_hours', label: 'Regular Pay', enabled: true },
    { key: 'sick_hours', label: 'Sick Pay', enabled: true },
    { key: 'vacation_hours', label: 'Vacation Pay', enabled: true },
    { key: 'external_id', label: 'External ID', enabled: true },
    { key: 'job_title', label: 'Job Title', enabled: true },
  ];
}

function validateFormatInput(formatName: string, columns: CSVColumnConfig[]): boolean {
  if (!formatName.trim()) {
    errorHandler.notify('Please enter a format name', 'error');
    return false;
  }

  if (columns.filter((c) => c.enabled).length === 0) {
    errorHandler.notify('Please enable at least one column', 'error');
    return false;
  }

  return true;
}

/** Creates or updates the format and notifies; returns the new id only when a format was created. */
async function persistFormat(
  isCreating: boolean,
  selectedFormatId: string | null,
  formatData: CSVExportFormatFormData
): Promise<{ id: string | null } | null> {
  if (isCreating) {
    const result = await createFormat(formatData);
    if (result.error) {
      throw result.error;
    }
    errorHandler.notify('Format created successfully', 'success');
    return { id: result.data?.id || null };
  }
  if (selectedFormatId) {
    const result = await updateFormat(selectedFormatId, formatData);
    if (result.error) {
      throw result.error;
    }
    errorHandler.notify('Format updated successfully', 'success');
  }
  return null;
}

function useColumnEditing() {
  const [columns, setColumns] = useState<CSVColumnConfig[]>([]);

  const toggleColumn = (index: number) => {
    const newColumns = [...columns];
    const column = newColumns[index];
    if (column) {
      column.enabled = !column.enabled;
      setColumns(newColumns);
    }
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newColumns.length) {
      return;
    }

    const sourceColumn = newColumns[index];
    const targetColumn = newColumns[targetIndex];

    if (sourceColumn && targetColumn) {
      [newColumns[index], newColumns[targetIndex]] = [targetColumn, sourceColumn];
      setColumns(newColumns);
    }
  };

  const updateColumnLabel = (index: number, newLabel: string) => {
    const newColumns = [...columns];
    const column = newColumns[index];
    if (column) {
      column.label = newLabel;
      setColumns(newColumns);
    }
  };

  return { columns, setColumns, toggleColumn, moveColumn, updateColumnLabel };
}

export function useFormatConfiguration({
  isOpen,
  onSave,
  currentFormatId,
}: {
  isOpen: boolean;
  onSave: () => void;
  currentFormatId?: string | undefined;
}) {
  const [formats, setFormats] = useState<CSVExportFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(currentFormatId || null);
  const [isCreating, setIsCreating] = useState(false);
  const [formatName, setFormatName] = useState('');
  const { columns, setColumns, toggleColumn, moveColumn, updateColumnLabel } = useColumnEditing();
  const [staffOrder, setStaffOrder] = useState<CSVStaffOrderConfig>({
    type: 'name',
    direction: 'asc',
  });
  const [loading, setLoading] = useState(false);

  const loadFormats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllFormats();
      if (result.error) {
        throw result.error;
      }
      setFormats(result.data || []);
    } catch (err) {
      errorHandler.handle(err, 'loadFormats');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load formats on mount
  useEffect(() => {
    if (isOpen) {
      void loadFormats();
    }
  }, [isOpen, loadFormats]);

  // Load selected format details
  useEffect(() => {
    if (selectedFormatId && formats.length > 0) {
      const format = formats.find((f) => f.id === selectedFormatId);
      if (format) {
        setFormatName(format.format_name);
        setColumns(format.column_config);
        setStaffOrder(format.staff_order_config);
      }
    }
  }, [selectedFormatId, formats, setColumns]);

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedFormatId(null);
    setFormatName('');
    setColumns([...buildDefaultColumns()]);
    setStaffOrder({ type: 'name', direction: 'asc' });
  };

  const handleSelectFormat = (formatId: string) => {
    setIsCreating(false);
    setSelectedFormatId(formatId);
  };

  const handleSaveFormat = async () => {
    if (!validateFormatInput(formatName, columns)) {
      return;
    }

    setLoading(true);
    try {
      const formatData = {
        format_name: formatName,
        is_default: false,
        column_config: columns,
        staff_order_config: staffOrder,
      };

      const created = await persistFormat(isCreating, selectedFormatId, formatData);
      if (created) {
        setIsCreating(false);
        setSelectedFormatId(created.id);
      }

      await loadFormats();
      onSave();
    } catch (err) {
      errorHandler.handle(err, 'handleSaveFormat');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFormat = async (formatId: string) => {
    if (!confirm('Are you sure you want to delete this format?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteFormat(formatId);
      if (result.error) {
        throw result.error;
      }
      errorHandler.notify('Format deleted successfully', 'success');
      setSelectedFormatId(null);
      setIsCreating(false);
      await loadFormats();
      onSave();
    } catch (err) {
      errorHandler.handle(err, 'handleDeleteFormat');
    } finally {
      setLoading(false);
    }
  };

  return {
    formats,
    selectedFormatId,
    isCreating,
    formatName,
    setFormatName,
    columns,
    toggleColumn,
    moveColumn,
    updateColumnLabel,
    staffOrder,
    setStaffOrder,
    loading,
    handleCreateNew,
    handleSelectFormat,
    handleSaveFormat,
    handleDeleteFormat,
  };
}
