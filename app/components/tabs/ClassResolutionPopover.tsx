'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import Modal from '@/components/ui/Modal';
import {
  deleteClassMapping,
  fetchAffectedIntroIds,
  getPriorClassMapping,
  updateIntroClass,
  updateIntroClassesById,
} from '@/lib/services/membership-tabs';
import { upsertClassMapping } from '@/lib/supabase/classMappings';
import { fetchSettings, updateSettings } from '@/lib/supabase/settings';
import type { Intro } from '@/types';

type UndoState = {
  affectedIds: string[];
  previousClass: string;
  previousMappingSystemName: string | null;
};

interface Props {
  intro: Intro;
  classTypes: string[];
  onClose: () => void;
  onResolved: () => void;
}

async function restorePriorMapping(rawClass: string, priorMapping: string | null) {
  if (priorMapping !== null) {
    await upsertClassMapping(rawClass, priorMapping).catch((_err) => {
      // best-effort rollback — ignore failure
    });
  } else {
    await deleteClassMapping(rawClass);
  }
}

function UndoBanner({ loading, onUndo }: { loading: boolean; onUndo: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
      <span className="text-sm text-amber-800">Changes applied</span>
      <button
        type="button"
        onClick={onUndo}
        disabled={loading}
        className="text-sm font-medium text-amber-700 hover:text-amber-900"
      >
        Undo
      </button>
    </div>
  );
}

function OwnerResolutionOptions({
  rawClass,
  classTypes,
  selectedClass,
  onSelectClass,
  loading,
  onKeepAsIs,
  onSaveMappingOnly,
  onApplyToAll,
}: {
  rawClass: string;
  classTypes: string[];
  selectedClass: string;
  onSelectClass: (value: string) => void;
  loading: boolean;
  onKeepAsIs: () => void;
  onSaveMappingOnly: () => void;
  onApplyToAll: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onKeepAsIs}
        disabled={loading}
        className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
      >
        <div className="font-medium">Keep as-is</div>
        <div className="text-gray-500 text-xs">Add "{rawClass}" as a new class type</div>
      </button>

      <div className="border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="text-sm font-medium text-gray-700">Change to...</div>
        <select
          value={selectedClass}
          onChange={(e) => onSelectClass(e.target.value)}
          className="form-select w-full text-sm"
        >
          <option value="">Select a class</option>
          {classTypes.map((ct) => (
            <option key={ct} value={ct}>
              {ct}
            </option>
          ))}
        </select>
        {selectedClass && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onSaveMappingOnly}
              disabled={loading}
              className="btn btn-secondary flex-1 text-sm"
            >
              Save mapping only
            </button>
            <button
              type="button"
              onClick={onApplyToAll}
              disabled={loading}
              className="btn btn-primary flex-1 text-sm"
            >
              Apply to all intros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClassResolutionPopover({ intro, classTypes, onClose, onResolved }: Props) {
  const { isOwner } = useAuth();
  const rawClass = intro.class || '';
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  function fail(message: string) {
    setError(message);
    setLoading(false);
  }

  async function handleKeepAsIs() {
    setLoading(true);
    setError('');
    const priorMapping = await getPriorClassMapping(rawClass);
    try {
      await upsertClassMapping(rawClass, rawClass);
    } catch {
      fail('Failed to save mapping. Please try again.');
      return;
    }
    try {
      const current = await fetchSettings('class_types');
      if (!current.includes(rawClass)) {
        await updateSettings('class_types', [...current, rawClass]);
      }
    } catch {
      await restorePriorMapping(rawClass, priorMapping);
      fail('Failed to update class list. Please try again.');
      return;
    }
    setLoading(false);
    onResolved();
  }

  async function handleSaveMappingOnly() {
    if (!selectedClass) {
      return;
    }
    setLoading(true);
    setError('');
    const priorMapping = await getPriorClassMapping(rawClass);
    try {
      await upsertClassMapping(rawClass, selectedClass);
    } catch {
      fail('Failed to save mapping. Please try again.');
      return;
    }
    setLoading(false);
    setUndoState({
      affectedIds: [],
      previousClass: rawClass,
      previousMappingSystemName: priorMapping,
    });
    onResolved();
  }

  async function handleApplyToAll() {
    if (!selectedClass) {
      return;
    }
    setLoading(true);
    setError('');
    const priorMapping = await getPriorClassMapping(rawClass);

    const affectedIds = await fetchAffectedIntroIds(rawClass);

    try {
      await upsertClassMapping(rawClass, selectedClass);
    } catch {
      fail('Failed to save mapping. Please try again.');
      return;
    }

    const { error: updateError } = await updateIntroClass(rawClass, selectedClass);

    if (updateError) {
      await restorePriorMapping(rawClass, priorMapping);
      fail('Failed to update intros. Please try again.');
      return;
    }

    setLoading(false);
    setUndoState({ affectedIds, previousClass: rawClass, previousMappingSystemName: priorMapping });
    onResolved();
    setTimeout(() => setUndoState(null), 6000);
  }

  async function handleUndo() {
    if (!undoState) {
      return;
    }
    setLoading(true);
    try {
      if (undoState.affectedIds.length > 0) {
        await updateIntroClassesById(undoState.affectedIds, undoState.previousClass);
      }
      if (undoState.previousMappingSystemName !== null) {
        await upsertClassMapping(rawClass, undoState.previousMappingSystemName);
      } else {
        await deleteClassMapping(rawClass);
      }
      setUndoState(null);
      onResolved();
    } catch {
      setError('Undo failed. Please correct manually.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Resolve Unknown Class" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">"{rawClass}"</span> is not a recognised class.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {undoState && (
          <UndoBanner
            loading={loading}
            onUndo={() => {
              void handleUndo();
            }}
          />
        )}

        {isOwner ? (
          <OwnerResolutionOptions
            rawClass={rawClass}
            classTypes={classTypes}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            loading={loading}
            onKeepAsIs={() => {
              void handleKeepAsIs();
            }}
            onSaveMappingOnly={() => {
              void handleSaveMappingOnly();
            }}
            onApplyToAll={() => {
              void handleApplyToAll();
            }}
          />
        ) : (
          <p className="text-sm text-gray-500">
            Only owners can resolve unrecognised class names. Contact your gym owner.
          </p>
        )}
      </div>
    </Modal>
  );
}
