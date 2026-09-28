'use client';

import { Upload, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ImportFooter } from './TemplateImportModal/ImportFooter';
import { ImportStepIndicator } from './TemplateImportModal/ImportStepIndicator';
import { MappingStep } from './TemplateImportModal/MappingStep';
import { PreviewStep } from './TemplateImportModal/PreviewStep';
import { ReviewStep } from './TemplateImportModal/ReviewStep';
import { UploadStep } from './TemplateImportModal/UploadStep';
import { useTemplateImport } from './TemplateImportModal/useTemplateImport';

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  existingFormatNames: string[];
}

export default function TemplateImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingFormatNames,
}: TemplateImportModalProps) {
  const {
    currentStep,
    selectedFile,
    setSelectedFile,
    templateName,
    setTemplateName,
    analysis,
    fieldMappings,
    loading,
    dragOver,
    handleClose,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleAnalyze,
    handleProceedToMapping,
    handleMappingChange,
    handlePreview,
    handleSave,
  } = useTemplateImport({ onClose, onImportSuccess, existingFormatNames });

  if (!isOpen) {
    return null;
  }

  const mappedFields = new Set(fieldMappings.map((m) => m.dbField));
  const unmappedCsvColumns =
    analysis?.headers.filter((header) => !fieldMappings.some((m) => m.csvColumn === header)) || [];

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
            <Upload className="modal-header-icon" />
            Import CSV Template
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <ImportStepIndicator currentStep={currentStep} />

        {/* Content */}
        <div className="modal-body">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <UploadStep
              dragOver={dragOver}
              selectedFile={selectedFile}
              templateName={templateName}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onFileSelect={handleFileSelect}
              onClearFile={() => setSelectedFile(null)}
              onTemplateNameChange={setTemplateName}
            />
          )}

          {/* Step 2: Review */}
          {currentStep === 'review' && analysis && <ReviewStep analysis={analysis} />}

          {/* Step 3: Manual Mapping */}
          {currentStep === 'mapping' && analysis && (
            <MappingStep
              analysis={analysis}
              fieldMappings={fieldMappings}
              mappedFields={mappedFields}
              unmappedCsvColumns={unmappedCsvColumns}
              onMappingChange={handleMappingChange}
            />
          )}

          {/* Step 4: Preview */}
          {currentStep === 'preview' && (
            <PreviewStep templateName={templateName} fieldMappings={fieldMappings} />
          )}
        </div>

        {/* Footer */}
        <ImportFooter
          currentStep={currentStep}
          loading={loading}
          selectedFile={selectedFile}
          onCancel={handleClose}
          onAnalyze={() => {
            void handleAnalyze();
          }}
          onProceedToMapping={handleProceedToMapping}
          onPreview={handlePreview}
          onSave={() => {
            void handleSave();
          }}
        />
      </div>
    </div>,
    modalRoot
  );
}
