'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Plus, Edit2, Trash2, CheckSquare, Square, Settings, X } from 'lucide-react';
import Papa from 'papaparse';
import { fetchHolds, createHold, updateHold, deleteHold, fetchSettings, updateSettings, supabase } from '../../lib/supabase/client';

interface Hold {
  id: string;
  month: string;
  name: string;
  start: string;
  end: string;
  reason: string;
  fee?: string;
  created_at?: string;
  [key: string]: any;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HoldsTab() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingHold, setEditingHold] = useState<Hold | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [holdReasons, setHoldReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState('');
  const [editingReasonIndex, setEditingReasonIndex] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [newHold, setNewHold] = useState({
    month: '',
    name: '',
    start: '',
    end: '',
    reason: '',
    fee: '',
  });

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadHolds();
    loadSettings();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterReason, filterStatus, sortOrder]);

  const loadHolds = async () => {
    try {
      setLoading(true);
      const data = await fetchHolds();
      setHolds(data);
    } catch (error) {
      console.error('Error loading holds:', error);
      alert('Error loading holds');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const reasons = await fetchSettings('hold_reasons');
    if (reasons) setHoldReasons(reasons);
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;

    try {
      const cleanStr = dateStr.trim();

      // Check if it's in MM/DD/YY or MM/DD/YYYY format
      const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
      const match = cleanStr.match(slashPattern);

      if (match) {
        let [_, month, day, year] = match;

        // Convert 2-digit year to 4-digit year
        if (year.length === 2) {
          const yearNum = parseInt(year);
          // Assume years 00-50 are 2000-2050, and 51-99 are 1951-1999
          year = yearNum <= 50 ? `20${year}` : `19${year}`;
        }

        // Pad month and day with leading zeros
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');

        // Return in YYYY-MM-DD format for database
        return `${year}-${month}-${day}`;
      }

      // Try parsing as standard date format (fallback)
      const date = new Date(cleanStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return null;
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      transformHeader: (header: string) => header.trim(),
      complete: (results: any) => {
        try {
          const parsedData = results.data
            .filter((row: any) => {
              if (!row || typeof row !== 'object') return false;
              const name = String(row.NAME || row.name || row.Name || '').trim();
              if (!name) return false;
              const lowerName = name.toLowerCase();
              if (lowerName === 'total' || lowerName === 'avg' || lowerName === 'average') return false;
              return true;
            })
            .map((row: any) => {
              const startRaw = String(row.START || row.start || row.Start || '').trim();
              const endRaw = String(row.END || row.end || row.End || '').trim();

              return {
                month: String(row.MONTH || row.month || row.Month || '').trim(),
                name: String(row.NAME || row.name || row.Name || '').trim(),
                start: parseDate(startRaw),
                end: parseDate(endRaw),
                reason: String(row.REASON || row.reason || row.Reason || '').trim(),
                fee: String(row.FEE || row.fee || row.Fee || '').trim(),
              };
            });

          setImportPreviewData(parsedData);
          setShowImportPreview(true);
        } catch (error) {
          console.error('Error processing CSV data:', error);
          alert('Error processing CSV file. Please check the file format.');
        }
      },
      error: (error: any) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file. Please check the file format.');
      }
    });

    event.target.value = '';
  };

  const confirmCSVImport = async () => {
    if (!importPreviewData || importPreviewData.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      setLoading(true);

      const newRecords = importPreviewData.filter(row => {
        if (!row.name || !row.month) return false;
        const isDuplicate = holds.some(h =>
          h.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
          h.month === row.month &&
          h.start === row.start
        );
        return !isDuplicate;
      });

      const duplicateCount = importPreviewData.length - newRecords.length;

      if (newRecords.length === 0) {
        alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
        setShowImportPreview(false);
        setImportPreviewData([]);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('holds').insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await loadHolds();
        setShowImportPreview(false);
        setImportPreviewData([]);
        alert(`✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`);
      }
    } catch (error) {
      console.error('Fatal error importing CSV:', error);
      alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHold = async () => {
    if (!newHold.name || !newHold.month) {
      alert('Please fill in required fields: Name and Month');
      return;
    }

    try {
      const holdData = {
        ...newHold,
        start: newHold.start || null,
        end: newHold.end || null,
      };

      await createHold(holdData);
      await loadHolds();
      setShowAddModal(false);
      setNewHold({ month: '', name: '', start: '', end: '', reason: '', fee: '' });
      alert('Hold added successfully!');
    } catch (error) {
      console.error('Error adding hold:', error);
      alert('Error adding hold');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete hold for ${name}?`)) return;
    try {
      await deleteHold(id);
      await loadHolds();
    } catch (error) {
      console.error('Error deleting hold:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select holds to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected holds?`)) return;

    try {
      setLoading(true);
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('holds').delete().in('id', batch);
        if (error) throw error;
      }

      await loadHolds();
      setSelectedIds(new Set());
      setCurrentPage(1);
      alert(`✅ Deleted ${idsToDelete.length} holds`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting holds');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingHold) return;
    try {
      const holdData = {
        ...editingHold,
        start: editingHold.start || null,
        end: editingHold.end || null,
      };
      await updateHold(editingHold.id, holdData);
      await loadHolds();
      setShowEditModal(false);
      setEditingHold(null);
      alert('Hold updated!');
    } catch (error) {
      console.error('Error updating hold:', error);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedHolds.map(h => h.id);
    const allCurrentSelected = currentPageIds.every(id => selectedIds.has(id));
    const newSelected = new Set(selectedIds);
    if (allCurrentSelected) {
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      currentPageIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const addReason = async () => {
    if (newReason.trim() && !holdReasons.includes(newReason.trim())) {
      const updated = [...holdReasons, newReason.trim()].sort();
      setHoldReasons(updated);
      try {
        await updateSettings('hold_reasons', updated);
        setNewReason('');
      } catch (error) {
        console.error('Error saving reason:', error);
        alert('Failed to save reason');
      }
    }
  };

  const deleteReason = async (index: number) => {
    if (confirm('Are you sure you want to delete this reason?')) {
      const updated = holdReasons.filter((_, i) => i !== index);
      setHoldReasons(updated);
      try {
        await updateSettings('hold_reasons', updated);
      } catch (error) {
        console.error('Error deleting reason:', error);
        alert('Failed to delete reason');
      }
    }
  };

  const updateReason = async (index: number, newValue: string) => {
    const updated = [...holdReasons];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setHoldReasons(sorted);
    setEditingReasonIndex(null);
    try {
      await updateSettings('hold_reasons', sorted);
    } catch (error) {
      console.error('Error updating reason:', error);
      alert('Failed to update reason');
    }
  };

  const getHoldStatus = (start?: string, end?: string): string => {
    if (!start) return 'unknown';
    const today = new Date();
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (startDate > today) return 'upcoming';
    if (endDate && endDate < today) return 'ended';
    return 'active';
  };

  const months = [...new Set(holds.map(h => h.month))].filter(Boolean);

  const filteredHolds = holds.filter(hold => {
    if (filterMonth !== 'all' && hold.month !== filterMonth) return false;
    if (filterReason !== 'all' && hold.reason !== filterReason) return false;
    if (filterStatus !== 'all') {
      const status = getHoldStatus(hold.start, hold.end);
      if (status !== filterStatus) return false;
    }
    return true;
  });

  const sortedHolds = [...filteredHolds].sort((a, b) => {
    const dateA = a.start ? new Date(a.start).getTime() : 0;
    const dateB = b.start ? new Date(b.start).getTime() : 0;

    if (dateA && dateB) {
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    }

    if (dateA && !dateB) return sortOrder === 'newest' ? -1 : 1;
    if (!dateA && dateB) return sortOrder === 'newest' ? 1 : -1;

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === 'newest' ? createdB - createdA : createdA - createdB;
  });

  const totalPages = Math.ceil(sortedHolds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHolds = sortedHolds.slice(startIndex, endIndex);

  const statusCounts = {
    active: filteredHolds.filter(h => getHoldStatus(h.start, h.end) === 'active').length,
    upcoming: filteredHolds.filter(h => getHoldStatus(h.start, h.end) === 'upcoming').length,
    ended: filteredHolds.filter(h => getHoldStatus(h.start, h.end) === 'ended').length,
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';

      // Format as MM/DD/YY
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2); // Get last 2 digits

      return `${month}/${day}/${year}`;
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Membership Holds</h2>
        <div className="flex space-x-3">
          <button onClick={() => setShowSettingsModal(true)} className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-600 text-gray-600 rounded font-medium hover:bg-gray-50">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCSVImport} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded font-medium hover:bg-blue-50">
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700">
            <Plus className="w-4 h-4" />
            <span>Add Hold</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Holds</div>
          <div className="text-3xl font-bold mt-1">{filteredHolds.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-3xl font-bold mt-1">{statusCounts.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">Upcoming</div>
          <div className="text-3xl font-bold mt-1">{statusCounts.upcoming}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-600">
          <div className="text-sm text-gray-600">Ended</div>
          <div className="text-3xl font-bold mt-1">{statusCounts.ended}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Months</option>
              {months.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Reasons</option>
              {holdReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedHolds.length)} of {sortedHolds.length}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">First</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">Prev</button>
            <span className="px-4 py-2 text-sm font-medium">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">Last</button>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{selectedIds.size} item(s) selected</span>
              <button onClick={() => setSelectedIds(new Set())} className="text-sm text-red-600 hover:text-red-700 font-medium">Clear Selection</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">All Holds ({sortedHolds.length})</h3>
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700">
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button onClick={toggleSelectAll} title="Select all on this page">
                    {paginatedHolds.length > 0 && paginatedHolds.every(h => selectedIds.has(h.id)) ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedHolds.map((hold) => {
                const status = getHoldStatus(hold.start, hold.end);
                return (
                  <tr key={hold.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelection(hold.id)}>
                        {selectedIds.has(hold.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{hold.month}</td>
                    <td className="px-6 py-4 text-sm font-medium">{hold.name}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(hold.start)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(hold.end)}</td>
                    <td className="px-6 py-4 text-sm">{hold.reason || '-'}</td>
                    <td className="px-6 py-4 text-sm">{hold.fee || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'active' ? 'bg-green-100 text-green-800' :
                        status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => { setEditingHold({ ...hold }); setShowEditModal(true); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(hold.id, hold.name)} className="text-red-600 hover:text-red-800" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl font-bold mb-4">Add New Hold</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month *</label>
                <select value={newHold.month} onChange={(e) => setNewHold({ ...newHold, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select month</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={newHold.name} onChange={(e) => setNewHold({ ...newHold, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" value={newHold.end} onChange={(e) => setNewHold({ ...newHold, end: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={newHold.reason} onChange={(e) => setNewHold({ ...newHold, reason: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select reason</option>
                  {holdReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fee</label>
                <input type="text" value={newHold.fee} onChange={(e) => setNewHold({ ...newHold, fee: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewHold({ month: '', name: '', start: '', end: '', reason: '', fee: '' }); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddHold} disabled={!newHold.name || !newHold.month} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Add Hold</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingHold && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl font-bold mb-4">Edit Hold</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={editingHold.month} onChange={(e) => setEditingHold({ ...editingHold, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={editingHold.name} onChange={(e) => setEditingHold({ ...editingHold, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" value={editingHold.start || ''} onChange={(e) => setEditingHold({ ...editingHold, start: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="date" value={editingHold.end || ''} onChange={(e) => setEditingHold({ ...editingHold, end: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={editingHold.reason} onChange={(e) => setEditingHold({ ...editingHold, reason: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select reason</option>
                  {holdReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fee</label>
                <input type="text" value={editingHold.fee || ''} onChange={(e) => setEditingHold({ ...editingHold, fee: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingHold(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSave} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showImportPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '64rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 className="text-xl font-bold mb-4">Confirm CSV Import</h3>
            <p className="text-sm text-gray-600 mb-4">Review {importPreviewData.length} records:</p>
            <div className="border rounded overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Month</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Start</th>
                    <th className="px-4 py-2 text-left">End</th>
                    <th className="px-4 py-2 text-left">Reason</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importPreviewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{row.month}</td>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{row.start || '-'}</td>
                      <td className="px-4 py-2">{row.end || '-'}</td>
                      <td className="px-4 py-2">{row.reason}</td>
                      <td className="px-4 py-2">
                        {holds.some(h => h.name.toLowerCase().trim() === row.name.toLowerCase().trim() && h.month === row.month && h.start === row.start) ? (
                          <span className="text-red-600 text-xs font-medium">Duplicate</span>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowImportPreview(false); setImportPreviewData([]); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={confirmCSVImport} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Confirm Import</button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '48rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Manage Hold Reasons</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Reason</label>
                <div className="flex gap-2">
                  <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addReason()} placeholder="Enter hold reason" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                  <button onClick={addReason} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 mb-3">Current Reasons ({holdReasons.length})</h4>
                {holdReasons.map((reason, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    {editingReasonIndex === index ? (
                      <input type="text" defaultValue={reason} onBlur={(e) => updateReason(index, e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { updateReason(index, (e.target as HTMLInputElement).value); } }} className="flex-1 px-2 py-1 border border-gray-300 rounded" autoFocus />
                    ) : (
                      <span className="flex-1">{reason}</span>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setEditingReasonIndex(index)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteReason(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowSettingsModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}