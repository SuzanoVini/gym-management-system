import { FileUp, X } from 'lucide-react';

interface UploadStepProps {
  dragOver: boolean;
  selectedFile: File | null;
  templateName: string;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  onTemplateNameChange: (name: string) => void;
}

export function UploadStep({
  dragOver,
  selectedFile,
  templateName,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onClearFile,
  onTemplateNameChange,
}: UploadStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Your Accountant's CSV Template
        </h3>
        <p className="text-sm text-gray-600">
          We'll analyze the template and automatically create a matching export format
        </p>
      </div>

      {/* Drop Zone */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Drop zone for file upload */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragOver ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <FileUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">Drop your CSV file here, or</p>
          <label className="btn btn-secondary inline-flex">
            Browse Files
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileSelect(file);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Supported formats: CSV (.csv) • Max file size: 10MB
        </p>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{selectedFile.name}</p>
                <p className="text-sm text-blue-700">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearFile}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Template Name */}
      {selectedFile && (
        <div>
          <label htmlFor="template-name" className="form-label">
            Template Name
          </label>
          <input
            id="template-name"
            type="text"
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            className="form-input w-full"
            placeholder="e.g., Accountant Format 2026"
          />
          <p className="text-xs text-gray-500 mt-1">Give this template a memorable name</p>
        </div>
      )}
    </div>
  );
}
