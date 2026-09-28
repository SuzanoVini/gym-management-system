import type { EditingItem } from './useSettingsModalState';

// Shared by the Class Types and Staff Members tabs, which render the same
// add / rename / remove list.
export default function EditableListPanel({
  items,
  editing,
  onEditingChange,
  newValue,
  onNewValueChange,
  placeholder,
  isOwner,
  loading,
  renameLoading,
  onAdd,
  onRename,
  onRemove,
}: {
  items: string[];
  editing: EditingItem;
  onEditingChange: (editing: EditingItem) => void;
  newValue: string;
  onNewValueChange: (value: string) => void;
  placeholder: string;
  isOwner: boolean;
  loading: boolean;
  renameLoading: boolean;
  onAdd: () => void;
  onRename: (applyToAll: boolean) => void;
  onRemove: (item: string) => void;
}) {
  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex space-x-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => onNewValueChange(e.target.value)}
            placeholder={placeholder}
            className="form-input flex-1"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={loading || !newValue.trim()}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.map((item) =>
          editing?.original === item ? (
            <div key={item} className="p-2 bg-blue-50 rounded border border-blue-200">
              <input
                type="text"
                value={editing.value}
                onChange={(e) => onEditingChange({ original: item, value: e.target.value })}
                className="form-input w-full text-sm mb-2"
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onRename(false)}
                  disabled={renameLoading}
                  className="btn btn-secondary text-xs px-2 py-1"
                >
                  Save (settings only)
                </button>
                <button
                  type="button"
                  onClick={() => onRename(true)}
                  disabled={renameLoading}
                  className="btn btn-primary text-xs px-2 py-1"
                >
                  Save + apply to all intros
                </button>
                <button
                  type="button"
                  onClick={() => onEditingChange(null)}
                  disabled={renameLoading}
                  className="btn btn-secondary text-xs px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={item} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium">{item}</span>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEditingChange({ original: item, value: item })}
                    disabled={loading}
                    className="btn-icon text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    disabled={loading}
                    className="btn-icon text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
