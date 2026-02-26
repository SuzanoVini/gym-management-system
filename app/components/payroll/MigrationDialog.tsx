'use client';

import { AlertCircle, AlertTriangle, CheckCircle, Download, XCircle } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  cleanupLegacyData,
  exportLegacyDataToFile,
  type MigrationResult,
  migrateLegacyData,
  parseLegacyData,
  setMigrationSkipped,
} from '@/lib/migration/payroll-migration';

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type MigrationState = 'prompt' | 'in_progress' | 'success' | 'error';

export default function MigrationDialog({ isOpen, onClose, onComplete }: MigrationDialogProps) {
  const [state, setState] = useState<MigrationState>('prompt');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const handleMigrateNow = async () => {
    setState('in_progress');
    setProgress(0);
    setProgressMessage('Starting migration...');

    try {
      // Parse legacy data
      const data = parseLegacyData();

      // Run migration
      const result = await migrateLegacyData(data, (step, progressPercent) => {
        setProgressMessage(step);
        setProgress(progressPercent);
      });

      setMigrationResult(result);

      if (result.success || result.migrated.staff > 0 || result.migrated.periods > 0) {
        // If migration was successful or partial, clean up localStorage
        cleanupLegacyData();
        setState('success');

        // Auto-close after 3 seconds on success
        setTimeout(() => {
          onComplete();
          onClose();
        }, 3000);
      } else {
        setState('error');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationResult({
        success: false,
        migrated: { staff: 0, hours: 0, periods: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        skipped: { staff: 0, hours: 0, periods: 0 },
      });
      setState('error');
    }
  };

  const handleBackupAndMigrate = async () => {
    try {
      exportLegacyDataToFile();
      // Wait a moment for download to start
      await new Promise((resolve) => setTimeout(resolve, 500));
      handleMigrateNow();
    } catch (error) {
      console.error('Backup error:', error);
      alert(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSkip = () => {
    setMigrationSkipped();
    onClose();
  };

  const handleRetry = () => {
    setState('prompt');
    setProgress(0);
    setProgressMessage('');
    setMigrationResult(null);
  };

  const renderPrompt = () => (
    <div className="space-y-4">
      <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900">Legacy Payroll Data Detected</h3>
          <p className="text-sm text-blue-800 mt-1">
            We found payroll data from the old system in your browser. We can automatically migrate
            this data to the new cloud-based system.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">What will be migrated:</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Staff members and job titles</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Payroll periods and dates</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Staff hours and time entries</span>
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">What happens after migration:</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Data is stored securely in the cloud</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Access from any device</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Old browser data is removed</span>
          </li>
        </ul>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={handleBackupAndMigrate}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Backup & Migrate</span>
        </button>
        <button
          type="button"
          onClick={handleMigrateNow}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Migrate Now
        </button>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
      >
        Skip for now
      </button>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Tip: We recommend using "Backup & Migrate" to save a copy of your data before migration.
        </p>
      </div>
    </div>
  );

  const renderInProgress = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>

      <div className="space-y-3">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">{progressMessage}</p>
          <p className="text-sm text-gray-600 mt-1">{progress}% complete</p>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Please do not close this window or navigate away. Migration is in progress...
          </p>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center space-y-3 py-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Migration Complete!</h3>
        <p className="text-gray-600 text-center">
          Your payroll data has been successfully migrated to the new system.
        </p>
      </div>

      {migrationResult && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Successfully Migrated:</h4>
            <div className="space-y-1 text-sm text-green-800">
              <p>Staff Members: {migrationResult.migrated.staff}</p>
              <p>Payroll Periods: {migrationResult.migrated.periods}</p>
              <p>Staff Hours: {migrationResult.migrated.hours}</p>
            </div>
          </div>

          {(migrationResult.skipped.staff > 0 ||
            migrationResult.skipped.periods > 0 ||
            migrationResult.skipped.hours > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Skipped (Already Exists):</h4>
              <div className="space-y-1 text-sm text-blue-800">
                {migrationResult.skipped.staff > 0 && (
                  <p>Staff Members: {migrationResult.skipped.staff}</p>
                )}
                {migrationResult.skipped.periods > 0 && (
                  <p>Payroll Periods: {migrationResult.skipped.periods}</p>
                )}
                {migrationResult.skipped.hours > 0 && (
                  <p>Staff Hours: {migrationResult.skipped.hours}</p>
                )}
              </div>
            </div>
          )}

          {migrationResult.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Warnings:</h4>
              <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                {migrationResult.errors.slice(0, 5).map((error) => (
                  <li key={error}>{error}</li>
                ))}
                {migrationResult.errors.length > 5 && (
                  <li className="text-xs">
                    ... and {migrationResult.errors.length - 5} more warnings
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500 text-center pt-4">
        This window will close automatically in a moment...
      </p>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center space-y-3 py-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Migration Failed</h3>
        <p className="text-gray-600 text-center">
          There was a problem migrating your data. Your original data is still safe.
        </p>
      </div>

      {migrationResult && migrationResult.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
          <ul className="space-y-1 text-sm text-red-800 list-disc list-inside">
            {migrationResult.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={handleRetry}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Skip
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Your original data is still stored in your browser and has not been deleted. You can try
          the migration again or contact support for assistance.
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (state) {
      case 'prompt':
        return renderPrompt();
      case 'in_progress':
        return renderInProgress();
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      default:
        return renderPrompt();
    }
  };

  const handleClose =
    state === 'in_progress'
      ? () => {
          // Prevent closing during migration
        }
      : onClose;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        state === 'prompt'
          ? 'Migrate Payroll Data'
          : state === 'in_progress'
            ? 'Migration in Progress'
            : state === 'success'
              ? 'Migration Successful'
              : 'Migration Failed'
      }
      size="lg"
    >
      {renderContent()}
    </Modal>
  );
}
