'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import Modal from '@/components/ui/Modal';
import { useSettingsStore } from '@/store/useSettingsStore';
import DefaultFiltersPanel, { type DefaultFilterScope } from './DefaultFiltersPanel';
import EditableListPanel from './SettingsModal/EditableListPanel';
import { RevenuePanel, SettingsTabBar } from './SettingsModal/SettingsPanels';
import { createSettingsHandlers } from './SettingsModal/settingsHandlers';
import { useSettingsModalState } from './SettingsModal/useSettingsModalState';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which tab opened the modal — decides which default filters are editable here. */
  scope?: DefaultFilterScope;
}

export default function SettingsModal({ isOpen, onClose, scope }: SettingsModalProps) {
  const { isOwner } = useAuth();
  const refreshSettings = useSettingsStore((s) => s.refresh);
  const state = useSettingsModalState(isOpen);
  const handlers = createSettingsHandlers(state, refreshSettings);
  const { activeTab, setActiveTab, editingClass, setEditingClass, editingStaff, setEditingStaff } =
    state;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      {/* Tabs */}
      <SettingsTabBar activeTab={activeTab} onSelect={setActiveTab} scope={scope} />

      {/* Content */}
      {activeTab === 'filters' && scope && <DefaultFiltersPanel scope={scope} />}

      {activeTab === 'revenue' && (
        <RevenuePanel
          revenueInput={state.revenueInput}
          onRevenueInputChange={state.setRevenueInput}
          isOwner={isOwner}
          revenueSaving={state.revenueSaving}
          onSave={() => {
            void handlers.handleSaveRevenue();
          }}
        />
      )}

      {activeTab === 'classes' && (
        <EditableListPanel
          items={state.classTypes}
          editing={editingClass}
          onEditingChange={setEditingClass}
          newValue={state.newClassType}
          onNewValueChange={state.setNewClassType}
          placeholder="Add new class type"
          isOwner={isOwner}
          loading={state.loading}
          renameLoading={state.renameLoading}
          onAdd={() => {
            void handlers.handleAddClassType();
          }}
          onRename={(applyToAll) => {
            void handlers.handleRenameClass(applyToAll);
          }}
          onRemove={(item) => {
            void handlers.handleRemoveClassType(item);
          }}
        />
      )}

      {activeTab === 'staff' && (
        <EditableListPanel
          items={state.staffMembers}
          editing={editingStaff}
          onEditingChange={setEditingStaff}
          newValue={state.newStaffMember}
          onNewValueChange={state.setNewStaffMember}
          placeholder="Add new staff member"
          isOwner={isOwner}
          loading={state.loading}
          renameLoading={state.renameLoading}
          onAdd={() => {
            void handlers.handleAddStaffMember();
          }}
          onRename={(applyToAll) => {
            void handlers.handleRenameStaff(applyToAll);
          }}
          onRemove={(item) => {
            void handlers.handleRemoveStaffMember(item);
          }}
        />
      )}
    </Modal>
  );
}
