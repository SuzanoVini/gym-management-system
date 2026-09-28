'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { reportConsoleError } from '@/lib/logger';
import {
  cleanupLegacyData,
  exportLegacyDataToFile,
  type MigrationResult,
  migrateLegacyData,
  parseLegacyData,
  setMigrationSkipped,
} from '@/lib/migration/payroll-migration';
import {
  MigrationError,
  MigrationInProgress,
  MigrationPrompt,
  MigrationSuccess,
} from './MigrationDialog/MigrationViews';

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
      reportConsoleError('Migration error:', error);
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
      void handleMigrateNow();
    } catch (error) {
      reportConsoleError('Backup error:', error);
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
    <MigrationPrompt
      onBackupAndMigrate={() => {
        void handleBackupAndMigrate();
      }}
      onMigrateNow={() => {
        void handleMigrateNow();
      }}
      onSkip={handleSkip}
    />
  );

  const renderContent = () => {
    switch (state) {
      case 'prompt':
        return renderPrompt();
      case 'in_progress':
        return <MigrationInProgress progress={progress} progressMessage={progressMessage} />;
      case 'success':
        return <MigrationSuccess migrationResult={migrationResult} />;
      case 'error':
        return (
          <MigrationError
            migrationResult={migrationResult}
            onRetry={handleRetry}
            onSkip={handleSkip}
          />
        );
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
