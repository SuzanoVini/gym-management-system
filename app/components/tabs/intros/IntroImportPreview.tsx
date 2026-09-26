import Modal from '@/components/ui/Modal';
import type { useIntroCsvImport } from '@/hooks/useIntroCsvImport';
import type { useUIStore } from '@/store/useUIStore';

export default function IntroImportPreview({
  csvImport,
  modals,
  closeModal,
}: {
  csvImport: ReturnType<typeof useIntroCsvImport>;
  modals: ReturnType<typeof useUIStore.getState>['modals'];
  closeModal: ReturnType<typeof useUIStore.getState>['closeModal'];
}) {
  const {
    importPreviewData,
    setImportPreviewData,
    setImportFile,
    importYear,
    handleImportYearChange,
    confirmCSVImport,
  } = csvImport;
  return (
    <Modal
      isOpen={modals.importPreview}
      onClose={() => {
        closeModal('importPreview');
        setImportPreviewData([]);
        setImportFile(null);
      }}
      title="Import Preview"
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            Preview of data to be imported. Duplicates will be automatically skipped.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="intro-import-year"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Year
            </label>
            <input
              id="intro-import-year"
              type="number"
              min={2000}
              max={2100}
              value={importYear}
              onChange={(e) => handleImportYearChange(Number(e.target.value))}
              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto border rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Class</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Staff</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Attended</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Signed Up</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {importPreviewData.slice(0, 50).map((row) => (
                <tr key={`${row.name}-${row.month}-${row.class ?? ''}`}>
                  <td className="px-4 py-2 text-sm">{row.name}</td>
                  <td className="px-4 py-2 text-sm">{row.month}</td>
                  <td className="px-4 py-2 text-sm">{row.class ?? '-'}</td>
                  <td className="px-4 py-2 text-sm">{row.staff ?? '-'}</td>
                  <td className="px-4 py-2 text-sm">{row.attended || '-'}</td>
                  <td className="px-4 py-2 text-sm">{row.signed_up || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {importPreviewData.length > 50 && (
          <p className="text-sm text-gray-500">
            Showing first 50 of {importPreviewData.length} records
          </p>
        )}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              closeModal('importPreview');
              setImportPreviewData([]);
              setImportFile(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmCSVImport}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Import {importPreviewData.length} Records
          </button>
        </div>
      </div>
    </Modal>
  );
}
