'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { upsertClassMapping } from '@/lib/supabase/classMappings';
import { supabase } from '@/lib/supabase/client';
import { fetchSettings, updateSettings } from '@/lib/supabase/settings';
import type { Intro } from '@/types';

interface Props {
  intro: Intro;
  classTypes: string[];
  onClose: () => void;
  onResolved: () => void;
}

export default function ClassResolutionPopover({ intro, classTypes, onClose, onResolved }: Props) {
  const rawClass = intro.class || '';
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [undoState, setUndoState] = useState<{
    affectedIds: string[];
    previousClass: string;
    previousMappingSystemName: string | null;
  } | null>(null);

  async function getPriorMapping(): Promise<string | null> {
    const { data } = await supabase
      .from('class_mappings')
      .select('system_name')
      .eq('zenplanner_name', rawClass)
      .maybeSingle();
    return data?.system_name ?? null;
  }

  async function handleKeepAsIs() {
    setLoading(true);
    setError('');
    const priorMapping = await getPriorMapping();
    try {
      await upsertClassMapping(rawClass, rawClass);
    } catch {
      setError('Failed to save mapping. Please try again.');
      setLoading(false);
      return;
    }
    try {
      const current = await fetchSettings('class_types');
      if (!current.includes(rawClass)) {
        await updateSettings('class_types', [...current, rawClass]);
      }
    } catch {
      if (priorMapping !== null) {
        await upsertClassMapping(rawClass, priorMapping).catch((_err) => {
          // best-effort rollback — ignore failure
        });
      } else {
        await supabase.from('class_mappings').delete().eq('zenplanner_name', rawClass);
      }
      setError('Failed to update class list. Please try again.');
      setLoading(false);
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
    const priorMapping = await getPriorMapping();
    try {
      await upsertClassMapping(rawClass, selectedClass);
    } catch {
      setError('Failed to save mapping. Please try again.');
      setLoading(false);
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
    const priorMapping = await getPriorMapping();

    const { data: affected } = await supabase.from('intros').select('id').eq('class', rawClass);
    const affectedIds = (affected ?? []).map((r: { id: string }) => r.id);

    try {
      await upsertClassMapping(rawClass, selectedClass);
    } catch {
      setError('Failed to save mapping. Please try again.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('intros')
      .update({ class: selectedClass })
      .eq('class', rawClass);

    if (updateError) {
      if (priorMapping !== null) {
        await upsertClassMapping(rawClass, priorMapping).catch((_err) => {
          // best-effort rollback — ignore failure
        });
      } else {
        await supabase.from('class_mappings').delete().eq('zenplanner_name', rawClass);
      }
      setError('Failed to update intros. Please try again.');
      setLoading(false);
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
        await supabase
          .from('intros')
          .update({ class: undoState.previousClass })
          .in('id', undoState.affectedIds);
      }
      if (undoState.previousMappingSystemName !== null) {
        await upsertClassMapping(rawClass, undoState.previousMappingSystemName);
      } else {
        await supabase.from('class_mappings').delete().eq('zenplanner_name', rawClass);
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
          <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <span className="text-sm text-amber-800">Changes applied</span>
            <button
              type="button"
              onClick={handleUndo}
              disabled={loading}
              className="text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Undo
            </button>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleKeepAsIs}
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
              onChange={(e) => setSelectedClass(e.target.value)}
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
                  onClick={handleSaveMappingOnly}
                  disabled={loading}
                  className="btn btn-secondary flex-1 text-sm"
                >
                  Save mapping only
                </button>
                <button
                  type="button"
                  onClick={handleApplyToAll}
                  disabled={loading}
                  className="btn btn-primary flex-1 text-sm"
                >
                  Apply to all intros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
