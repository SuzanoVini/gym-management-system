'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, FileUp, Save, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { createFormat } from '@/lib/services/csv-format.service';
import {
  AVAILABLE_DB_FIELDS,
  analyzeCSVTemplate,
  generateFormatConfig,
} from '@/lib/services/csv-template-analyzer';
import {
  validateCSVFile,
  validateTemplateAnalysis,
  validateTemplateName,
} from '@/lib/utils/csv-template-validator';
import type { FieldMapping, TemplateAnalysisResult } from '@/types';

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  existingFormatNames: string[];
}

type ImportStep = 'upload' | 'review' | 'mapping' | 'preview';

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex wizard component with multiple steps
export default function TemplateImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingFormatNames,
}: TemplateImportModalProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [analysis, setAnalysis] = useState<TemplateAnalysisResult | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setTemplateName('');
    setAnalysis(null);
    setFieldMappings([]);
    setLoading(false);
    onClose();
  }, [onClose]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    const fileValidation = validateCSVFile(file);
    if (!fileValidation.valid) {
      errorHandler.notify(fileValidation.errors.join(', '), 'error');
      return;
    }

    // Show warnings if any
    if (fileValidation.warnings.length > 0) {
      for (const warning of fileValidation.warnings) {
        errorHandler.notify(warning, 'warning');
      }
    }

    setSelectedFile(file);

    // Auto-generate template name from filename
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    setTemplateName(baseName);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Analyze the uploaded file
  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeCSVTemplate(selectedFile);

      // Validate analysis
      const validation = validateTemplateAnalysis(result);
      if (!validation.valid) {
        errorHandler.notify(validation.errors.join(', '), 'error');
        setLoading(false);
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          errorHandler.notify(warning, 'warning');
        }
      }

      setAnalysis(result);
      setFieldMappings(result.fieldMappings);
      setCurrentStep('review');
    } catch (err) {
      errorHandler.handle(err, 'handleAnalyze');
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  // Proceed to manual mapping
  const handleProceedToMapping = useCallback(() => {
    setCurrentStep('mapping');
  }, []);

  // Update a field mapping
  const handleMappingChange = useCallback((csvColumn: string, newDbField: string) => {
    setFieldMappings((prev) => {
      // Remove any existing mapping for this CSV column
      const filtered = prev.filter((m) => m.csvColumn !== csvColumn);

      if (newDbField === '') {
        // Unmapped
        return filtered;
      }

      // Add new mapping
      return [
        ...filtered,
        {
          csvColumn,
          dbField: newDbField,
          confidence: 'exact',
          suggested: false,
        },
      ];
    });
  }, []);

  // Preview the format configuration
  const handlePreview = useCallback(() => {
    // Validate mappings
    const mappedFields = new Set(fieldMappings.map((m) => m.dbField));
    const requiredFields = AVAILABLE_DB_FIELDS.filter((f) => f.required).map((f) => f.key);
    const missingRequired = requiredFields.filter((field) => !mappedFields.has(field));

    if (missingRequired.length > 0) {
      errorHandler.notify(`Missing required fields: ${missingRequired.join(', ')}`, 'error');
      return;
    }

    setCurrentStep('preview');
  }, [fieldMappings]);

  // Save the format configuration
  const handleSave = useCallback(async () => {
    // Validate template name
    const nameValidation = validateTemplateName(templateName, existingFormatNames);
    if (!nameValidation.valid) {
      errorHandler.notify(nameValidation.errors.join(', '), 'error');
      return;
    }

    setLoading(true);
    try {
      const formatConfig = generateFormatConfig(fieldMappings, templateName);
      const result = await createFormat(formatConfig);

      if (result.error) {
        throw result.error;
      }

      errorHandler.notify('Template imported successfully', 'success');
      onImportSuccess();
      handleClose();
    } catch (err) {
      errorHandler.handle(err, 'handleSave');
    } finally {
      setLoading(false);
    }
  }, [templateName, fieldMappings, existingFormatNames, onImportSuccess, handleClose]);

  if (!isOpen) {
    return null;
  }

  const mappedFields = new Set(fieldMappings.map((m) => m.dbField));
  const unmappedCsvColumns =
    analysis?.headers.filter((header) => !fieldMappings.some((m) => m.csvColumn === header)) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Import CSV Template</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { key: 'upload', label: 'Upload' },
              { key: 'review', label: 'Review' },
              { key: 'mapping', label: 'Map Fields' },
              { key: 'preview', label: 'Preview' },
            ].map((step, index, arr) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep === step.key
                        ? 'bg-red-600 text-white'
                        : arr.findIndex((s) => s.key === currentStep) > index
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {arr.findIndex((s) => s.key === currentStep) > index ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">{step.label}</span>
                </div>
                {index < arr.length - 1 && <div className="flex-1 h-0.5 bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
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
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
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
                          handleFileSelect(file);
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
                        <p className="text-sm text-blue-700">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
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
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., Accountant Format 2026"
                  />
                  <p className="text-xs text-gray-500 mt-1">Give this template a memorable name</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 'review' && analysis && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Template Analysis Complete
                </h3>
                <p className="text-sm text-gray-600">
                  Review the detected columns and automatic field mappings
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{analysis.headers.length}</div>
                  <div className="text-sm text-blue-700">Columns Detected</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {analysis.fieldMappings.length}
                  </div>
                  <div className="text-sm text-green-700">Auto-Mapped</div>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{analysis.rowCount}</div>
                  <div className="text-sm text-gray-700">Sample Rows</div>
                </div>
              </div>

              {/* Warnings */}
              {analysis.missingFields.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-900">Missing Required Fields</h4>
                      <p className="text-sm text-red-700 mt-1">
                        The following required fields were not found:{' '}
                        {analysis.missingFields.join(', ')}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        You'll need to manually map these in the next step.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {analysis.unmappedColumns.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Unmapped Columns</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {analysis.unmappedColumns.length} column(s) could not be automatically
                        mapped:
                      </p>
                      <p className="text-sm text-yellow-700 mt-1 font-mono">
                        {analysis.unmappedColumns.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Data Preview */}
              <div>
                <h4 className="form-label">Sample Data Preview</h4>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {analysis.headers.map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysis.sampleData.map((row, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: Sample data rows have no unique ID
                        <tr key={idx}>
                          {analysis.headers.map((header) => (
                            <td
                              key={`${idx}-${header}`}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Manual Mapping */}
          {currentStep === 'mapping' && analysis && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Adjust Field Mappings</h3>
                <p className="text-sm text-gray-600">
                  Review and customize how CSV columns map to database fields
                </p>
              </div>

              <div className="space-y-3">
                {analysis.headers.map((csvColumn) => {
                  const currentMapping = fieldMappings.find((m) => m.csvColumn === csvColumn);
                  const dbFieldInfo = currentMapping
                    ? AVAILABLE_DB_FIELDS.find((f) => f.key === currentMapping.dbField)
                    : null;
                  const isRequired = dbFieldInfo?.required;

                  return (
                    <div
                      key={csvColumn}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">CSV Column</div>
                          <div className="font-mono text-sm text-gray-900 p-2 bg-gray-50 rounded">
                            {csvColumn}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            Map to Database Field
                            {isRequired && <span className="text-red-600 ml-1">*</span>}
                          </div>
                          <select
                            value={currentMapping?.dbField || ''}
                            onChange={(e) => handleMappingChange(csvColumn, e.target.value)}
                            className="form-select w-full"
                          >
                            <option value="">-- Not Mapped --</option>
                            {AVAILABLE_DB_FIELDS.map((field) => (
                              <option
                                key={field.key}
                                value={field.key}
                                disabled={
                                  mappedFields.has(field.key) &&
                                  currentMapping?.dbField !== field.key
                                }
                              >
                                {field.label}
                                {field.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {currentMapping?.suggested && (
                        <div className="mt-2 text-xs text-green-600 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Auto-mapped ({currentMapping.confidence} match)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unmapped Columns Warning */}
              {unmappedCsvColumns.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900">
                        {unmappedCsvColumns.length} Unmapped Column(s)
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        These columns will not be included in the export format.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 'preview' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Export Format</h3>
                <p className="text-sm text-gray-600">
                  Review your new export format configuration before saving
                </p>
              </div>

              {/* Format Name */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Format Name</h4>
                <p className="text-blue-800">{templateName}</p>
              </div>

              {/* Column Configuration */}
              <div>
                <h4 className="form-label">Column Configuration</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Order
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Column Header
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Database Field
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fieldMappings.map((mapping, index) => {
                        const fieldInfo = AVAILABLE_DB_FIELDS.find(
                          (f) => f.key === mapping.dbField
                        );
                        return (
                          <tr key={mapping.csvColumn}>
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {mapping.csvColumn}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {fieldInfo?.label || mapping.dbField}
                              {fieldInfo?.required && <span className="text-red-600 ml-1">*</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Enabled
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            {currentStep === 'upload' && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile || loading}
                className="btn btn-primary"
              >
                {loading ? 'Analyzing...' : 'Analyze Template'}
              </button>
            )}

            {currentStep === 'review' && (
              <button type="button" onClick={handleProceedToMapping} className="btn btn-primary">
                Proceed to Mapping
              </button>
            )}

            {currentStep === 'mapping' && (
              <button type="button" onClick={handlePreview} className="btn btn-primary">
                Preview Format
              </button>
            )}

            {currentStep === 'preview' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="btn btn-primary"
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
