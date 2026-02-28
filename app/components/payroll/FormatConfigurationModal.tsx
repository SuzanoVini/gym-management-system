'use client';

import { ArrowDown, ArrowUp, Check, Plus, Save, Settings, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import {
  createFormat,
  deleteFormat,
  getAllFormats,
  updateFormat,
} from '@/lib/services/csv-format.service';
import type { CSVColumnConfig, CSVExportFormat, CSVStaffOrderConfig } from '@/types';

interface FormatConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentFormatId?: string;
}

export default function FormatConfigurationModal({
  isOpen,
  onClose,
  onSave,
  currentFormatId,
}: FormatConfigurationModalProps) {
  const [formats, setFormats] = useState<CSVExportFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(currentFormatId || null);
  const [isCreating, setIsCreating] = useState(false);
  const [formatName, setFormatName] = useState('');
  const [columns, setColumns] = useState<CSVColumnConfig[]>([]);
  const [staffOrder, setStaffOrder] = useState<CSVStaffOrderConfig>({
    type: 'name',
    direction: 'asc',
  });
  const [loading, setLoading] = useState(false);

  // Default column configuration
  const defaultColumns: CSVColumnConfig[] = [
    { key: 'staff_name', label: 'Staff Name', enabled: true },
    { key: 'employee_id', label: 'Payroll ID', enabled: true },
    { key: 'regular_hours', label: 'Regular Hours', enabled: true },
    { key: 'overtime_hours', label: 'Overtime Hours', enabled: true },
    { key: 'vacation_hours', label: 'Vacation Hours', enabled: true },
    { key: 'sick_hours', label: 'Sick Hours', enabled: true },
    { key: 'mat_cleaning_count', label: 'Mat Cleaning Count', enabled: true },
    { key: 'total_hours', label: 'Total Hours', enabled: true },
  ];

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
      loadFormats();
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
  }, [selectedFormatId, formats]);

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedFormatId(null);
    setFormatName('');
    setColumns([...defaultColumns]);
    setStaffOrder({ type: 'name', direction: 'asc' });
  };

  const handleSelectFormat = (formatId: string) => {
    setIsCreating(false);
    setSelectedFormatId(formatId);
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex save logic with validation
  const handleSaveFormat = async () => {
    if (!formatName.trim()) {
      errorHandler.notify('Please enter a format name', 'error');
      return;
    }

    if (columns.filter((c) => c.enabled).length === 0) {
      errorHandler.notify('Please enable at least one column', 'error');
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

      if (isCreating) {
        const result = await createFormat(formatData);
        if (result.error) {
          throw result.error;
        }
        errorHandler.notify('Format created successfully', 'success');
        setIsCreating(false);
        setSelectedFormatId(result.data?.id || null);
      } else if (selectedFormatId) {
        const result = await updateFormat(selectedFormatId, formatData);
        if (result.error) {
          throw result.error;
        }
        errorHandler.notify('Format updated successfully', 'success');
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">CSV Format Configuration</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Format List */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Saved Formats</h3>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="btn btn-sm btn-primary"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                </div>

                <div className="space-y-2">
                  {formats.map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => handleSelectFormat(format.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedFormatId === format.id
                          ? 'bg-red-50 border-red-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{format.format_name}</div>
                          {format.is_default && (
                            <div className="text-xs text-red-600 mt-1">Default</div>
                          )}
                        </div>
                        {selectedFormatId === format.id && (
                          <Check className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Format Details */}
            <div className="lg:col-span-2">
              {(isCreating || selectedFormatId) && (
                <div className="space-y-6">
                  {/* Format Name */}
                  <div>
                    <label htmlFor="format-name" className="form-label">
                      Format Name
                    </label>
                    <input
                      id="format-name"
                      type="text"
                      value={formatName}
                      onChange={(e) => setFormatName(e.target.value)}
                      className="form-input w-full"
                      placeholder="e.g., Standard Payroll Format"
                    />
                  </div>

                  {/* Column Configuration */}
                  <div>
                    <h4 className="form-label">Column Configuration</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Enable/disable columns, reorder them, and customize headers
                    </p>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {columns.map((column, index) => (
                        <div
                          key={column.key}
                          className={`flex items-center space-x-2 p-3 border rounded-lg ${
                            column.enabled
                              ? 'bg-white border-gray-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {/* Enable/Disable Checkbox */}
                          <input
                            type="checkbox"
                            checked={column.enabled}
                            onChange={() => toggleColumn(index)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />

                          {/* Move Buttons */}
                          <div className="flex flex-col space-y-1">
                            <button
                              type="button"
                              onClick={() => moveColumn(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveColumn(index, 'down')}
                              disabled={index === columns.length - 1}
                              className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Column Label Input */}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={column.label}
                              onChange={(e) => updateColumnLabel(index, e.target.value)}
                              className={`form-input w-full text-sm ${
                                column.enabled ? '' : 'opacity-50'
                              }`}
                              disabled={!column.enabled}
                            />
                            <div className="text-xs text-gray-400 mt-0.5">{column.key}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staff Order Configuration */}
                  <div>
                    <h4 className="form-label">Staff Order</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Choose how to order staff rows in the export
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="order-type" className="form-label text-sm">
                          Order By
                        </label>
                        <select
                          id="order-type"
                          value={staffOrder.type}
                          onChange={(e) =>
                            setStaffOrder({
                              ...staffOrder,
                              type: e.target.value as 'id' | 'name' | 'custom',
                            })
                          }
                          className="form-select w-full"
                        >
                          <option value="name">Staff Name</option>
                          <option value="id">Employee ID</option>
                          <option value="custom">Custom Order</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="order-direction" className="form-label text-sm">
                          Direction
                        </label>
                        <select
                          id="order-direction"
                          value={staffOrder.direction}
                          onChange={(e) =>
                            setStaffOrder({
                              ...staffOrder,
                              direction: e.target.value as 'asc' | 'desc',
                            })
                          }
                          className="form-select w-full"
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </div>

                    {staffOrder.type === 'custom' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Custom ordering is not yet implemented. Staff will be ordered by name.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {selectedFormatId && !isCreating && (
              <button
                type="button"
                onClick={() => handleDeleteFormat(selectedFormatId)}
                className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
                Delete Format
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            {(isCreating || selectedFormatId) && (
              <button
                type="button"
                onClick={handleSaveFormat}
                className="btn btn-primary"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Format'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
