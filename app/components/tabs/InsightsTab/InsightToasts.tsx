import type { Toast } from './useInsightToasts';

export default function InsightToasts({
  toasts,
  onUndo,
  onClose,
}: {
  toasts: Toast[];
  onUndo: (toast: Toast) => void;
  onClose: (toastId: string) => void;
}) {
  return (
    <>
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm"
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => onUndo(toast)}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => onClose(toast.id)}
                className="text-gray-400 hover:text-gray-300"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
