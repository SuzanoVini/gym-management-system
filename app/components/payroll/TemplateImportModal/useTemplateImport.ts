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

export type ImportStep = 'upload' | 'review' | 'mapping' | 'preview';

function notifyWarnings(warnings: string[]) {
  if (warnings.length > 0) {
    for (const warning of warnings) {
      errorHandler.notify(warning, 'warning');
    }
  }
}

function applyMappingChange(
  prev: FieldMapping[],
  csvColumn: string,
  newDbField: string
): FieldMapping[] {
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
}

function findMissingRequiredFields(fieldMappings: FieldMapping[]) {
  const mappedFields = new Set(fieldMappings.map((m) => m.dbField));
  const requiredFields = AVAILABLE_DB_FIELDS.filter((f) => f.required).map((f) => f.key);
  return requiredFields.filter((field) => !mappedFields.has(field));
}

export function useTemplateImport({
  onClose,
  onImportSuccess,
  existingFormatNames,
}: {
  onClose: () => void;
  onImportSuccess: () => void;
  existingFormatNames: string[];
}) {
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
    notifyWarnings(fileValidation.warnings);

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
      notifyWarnings(validation.warnings);

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
    setFieldMappings((prev) => applyMappingChange(prev, csvColumn, newDbField));
  }, []);

  // Preview the format configuration
  const handlePreview = useCallback(() => {
    // Validate mappings
    const missingRequired = findMissingRequiredFields(fieldMappings);

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

  return {
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
  };
}
