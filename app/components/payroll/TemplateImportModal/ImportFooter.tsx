import { Save } from 'lucide-react';
import type { ImportStep } from './useTemplateImport';

interface ImportFooterProps {
  currentStep: ImportStep;
  loading: boolean;
  selectedFile: File | null;
  onCancel: () => void;
  onAnalyze: () => void;
  onProceedToMapping: () => void;
  onPreview: () => void;
  onSave: () => void;
}

export function ImportFooter({
  currentStep,
  loading,
  selectedFile,
  onCancel,
  onAnalyze,
  onProceedToMapping,
  onPreview,
  onSave,
}: ImportFooterProps) {
  return (
    <div className="modal-footer justify-between">
      <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
        Cancel
      </button>

      <div className="flex items-center space-x-3">
        {currentStep === 'upload' && (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!selectedFile || loading}
            className="btn btn-primary"
          >
            {loading ? 'Analyzing...' : 'Analyze Template'}
          </button>
        )}

        {currentStep === 'review' && (
          <button type="button" onClick={onProceedToMapping} className="btn btn-primary">
            Proceed to Mapping
          </button>
        )}

        {currentStep === 'mapping' && (
          <button type="button" onClick={onPreview} className="btn btn-primary">
            Preview Format
          </button>
        )}

        {currentStep === 'preview' && (
          <button type="button" onClick={onSave} disabled={loading} className="btn btn-primary">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Format'}
          </button>
        )}
      </div>
    </div>
  );
}
