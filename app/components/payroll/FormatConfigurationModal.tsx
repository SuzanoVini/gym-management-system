'use client';

import { Save, Settings, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ColumnConfigList } from './FormatConfigurationModal/ColumnConfigList';
import { FormatList } from './FormatConfigurationModal/FormatList';
import { StaffOrderConfig } from './FormatConfigurationModal/StaffOrderConfig';
import { useFormatConfiguration } from './FormatConfigurationModal/useFormatConfiguration';

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
  const {
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
  } = useFormatConfiguration({ isOpen, onSave, currentFormatId });

  if (!isOpen) {
    return null;
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    return null;
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-content modal-xl">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-header-title">
            <Settings className="modal-header-icon" />
            CSV Format Configuration
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Format List */}
            <div className="lg:col-span-1">
              <FormatList
                formats={formats}
                selectedFormatId={selectedFormatId}
                loading={loading}
                onCreateNew={handleCreateNew}
                onSelectFormat={handleSelectFormat}
              />
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
                  <ColumnConfigList
                    columns={columns}
                    onToggle={toggleColumn}
                    onMove={moveColumn}
                    onLabelChange={updateColumnLabel}
                  />

                  {/* Staff Order Configuration */}
                  <StaffOrderConfig staffOrder={staffOrder} onChange={setStaffOrder} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer justify-between">
          <div>
            {selectedFormatId && !isCreating && (
              <button
                type="button"
                onClick={() => {
                  void handleDeleteFormat(selectedFormatId);
                }}
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
                onClick={() => {
                  void handleSaveFormat();
                }}
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
    </div>,
    modalRoot
  );
}
