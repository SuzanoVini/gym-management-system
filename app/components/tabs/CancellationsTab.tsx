'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Plus, Edit2, Trash2, CheckSquare, Square, Settings, X } from 'lucide-react';
import Papa from 'papaparse';
import { fetchCancellations, createCancellation, updateCancellation, deleteCancellation, fetchSettings, updateSettings, supabase } from '../../lib/supabase/client';

interface Cancellation {
  id: string;
  month: string;
  name: string;
  date: string;
  reason: string;
  age_group?: string;
  notes?: string;
  created_at?: string;
  [key: string]: any;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AGE_GROUPS = ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'];

export default function CancellationsTab() {
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingCancellation, setEditingCancellation] = useState<Cancellation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState('');
  const [editingReasonIndex, setEditingReasonIndex] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [newCancellation, setNewCancellation] = useState({
    month: '',
    name: '',
    date: '',
    reason: '',
    age_group: '',
    notes: '',
  });

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterAgeGroup, setFilterAgeGroup] = useState('all');

  useEffect(() => {
    loadCancellations();
    loadSettings();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterReason, filterAgeGroup, sortOrder]);

  const loadCancellations = async () => {
    try {
      setLoading(true);
      const data = await fetchCancellations();
      setCancellations(data);
    } catch (error) {
      console.error('Error loading cancellations:', error);
      alert('Error loading cancellations');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const reasons = await fetchSettings('cancellation_reasons');
    if (reasons) setCancellationReasons(reasons);
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    try {
      const cleanStr = dateStr.trim();
      const date = new Date(cleanStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return null;
    } catch (error) {
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
              const dateRaw = String(row.DATE || row.date || row.Date || '').trim();
              return {
                month: String(row.MONTH || row.month || row.Month || '').trim(),
                name: String(row.NAME || row.name || row.Name || '').trim(),
                date: parseDate(dateRaw),
                reason: String(row.REASON || row.reason || row.Reason || '').trim(),
                age_group: String(row['AGE GROUP'] || row.age_group || row['Age Group'] || '').trim(),
                notes: String(row.NOTES || row.notes || row.Notes || '').trim(),
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
        const isDuplicate = cancellations.some(c => 
          c.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
          c.month === row.month &&
          c.date === row.date
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

      const { error } = await supabase.from('cancellations').insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await loadCancellations();
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

  const handleAddCancellation = async () => {
    if (!newCancellation.name || !newCancellation.month) {
      alert('Please fill in required fields: Name and Month');
      return;
    }

    try {
      const cancellationData = {
        ...newCancellation,
        date: newCancellation.date || null,
      };

      await createCancellation(cancellationData);
      await loadCancellations();
      setShowAddModal(false);
      setNewCancellation({ month: '', name: '', date: '', reason: '', age_group: '', notes: '' });
      alert('Cancellation added successfully!');
    } catch (error) {
      console.error('Error adding cancellation:', error);
      alert('Error adding cancellation');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete cancellation for ${name}?`)) return;
    try {
      await deleteCancellation(id);
      await loadCancellations();
    } catch (error) {
      console.error('Error deleting cancellation:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select cancellations to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected cancellations?`)) return;

    try {
      setLoading(true);
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;
      
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('cancellations').delete().in('id', batch);
        if (error) throw error;
      }
      
      await loadCancellations();
      setSelectedIds(new Set());
      setCurrentPage(1);
      alert(`✅ Deleted ${idsToDelete.length} cancellations`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting cancellations');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingCancellation) return;
    try {
      const cancellationData = {
        ...editingCancellation,
        date: editingCancellation.date || null,
      };
      await updateCancellation(editingCancellation.id, cancellationData);
      await loadCancellations();
      setShowEditModal(false);
      setEditingCancellation(null);
      alert('Cancellation updated!');
    } catch (error) {
      console.error('Error updating cancellation:', error);
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
    const currentPageIds = paginatedCancellations.map(c => c.id);
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
    if (newReason.trim() && !cancellationReasons.includes(newReason.trim())) {
      const updated = [...cancellationReasons, newReason.trim()].sort();
      setCancellationReasons(updated);
      try {
        await updateSettings('cancellation_reasons', updated);
        setNewReason('');
      } catch (error) {
        console.error('Error saving reason:', error);
        alert('Failed to save reason');
      }
    }
  };

  const deleteReason = async (index: number) => {
    if (confirm('Are you sure you want to delete this reason?')) {
      const updated = cancellationReasons.filter((_, i) => i !== index);
      setCancellationReasons(updated);
      try {
        await updateSettings('cancellation_reasons', updated);
      } catch (error) {
        console.error('Error deleting reason:', error);
        alert('Failed to delete reason');
      }
    }
  };

  const updateReason = async (index: number, newValue: string) => {
    const updated = [...cancellationReasons];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setCancellationReasons(sorted);
    setEditingReasonIndex(null);
    try {
      await updateSettings('cancellation_reasons', sorted);
    } catch (error) {
      console.error('Error updating reason:', error);
      alert('Failed to update reason');
    }
  };

  const months = [...new Set(cancellations.map(c => c.month))].filter(Boolean);

  const filteredCancellations = cancellations.filter(cancellation => {
    if (filterMonth !== 'all' && cancellation.month !== filterMonth) return false;
    if (filterReason !== 'all' && cancellation.reason !== filterReason) return false;
    if (filterAgeGroup !== 'all' && cancellation.age_group !== filterAgeGroup) return false;
    return true;
  });

  const sortedCancellations = [...filteredCancellations].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    
    if (dateA && dateB) {
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    }
    
    if (dateA && !dateB) return sortOrder === 'newest' ? -1 : 1;
    if (!dateA && dateB) return sortOrder === 'newest' ? 1 : -1;
    
    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === 'newest' ? createdB - createdA : createdA - createdB;
  });

  const totalPages = Math.ceil(sortedCancellations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCancellations = sortedCancellations.slice(startIndex, endIndex);

  const reasonCounts = filteredCancellations.reduce((acc, c) => {
    acc[c.reason] = (acc[c.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        <h2 className="text-2xl font-bold">Cancellations</h2>
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
            <span>Add Cancellation</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Total Cancellations</div>
          <div className="text-3xl font-bold mt-1">{filteredCancellations.length}</div>
        </div>
        {topReasons.map(([reason, count], idx) => (
          <div key={reason} className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
            idx === 0 ? 'border-orange-600' :
            idx === 1 ? 'border-yellow-600' :
            idx === 2 ? 'border-blue-600' : 'border-gray-600'
          }`}>
            <div className="text-sm text-gray-600">{reason || 'No Reason'}</div>
            <div className="text-3xl font-bold mt-1">{count}</div>
          </div>
        ))}
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
              {cancellationReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
            <select value={filterAgeGroup} onChange={(e) => setFilterAgeGroup(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Ages</option>
              {AGE_GROUPS.map(age => <option key={age} value={age}>{age}</option>)}
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
            Showing {startIndex + 1}-{Math.min(endIndex, sortedCancellations.length)} of {sortedCancellations.length}
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
          <h3 className="text-lg font-semibold">All Cancellations ({sortedCancellations.length})</h3>
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
                    {paginatedCancellations.length > 0 && paginatedCancellations.every(c => selectedIds.has(c.id)) ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedCancellations.map((cancellation) => (
                <tr key={cancellation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelection(cancellation.id)}>
                      {selectedIds.has(cancellation.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{cancellation.month}</td>
                  <td className="px-6 py-4 text-sm font-medium">{cancellation.name}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(cancellation.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {cancellation.reason || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{cancellation.age_group || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{cancellation.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button onClick={() => { setEditingCancellation({ ...cancellation }); setShowEditModal(true); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cancellation.id, cancellation.name)} className="text-red-600 hover:text-red-800" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl font-bold mb-4">Add New Cancellation</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month *</label>
                <select value={newCancellation.month} onChange={(e) => setNewCancellation({ ...newCancellation, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select month</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={newCancellation.name} onChange={(e) => setNewCancellation({ ...newCancellation, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={newCancellation.date} onChange={(e) => setNewCancellation({ ...newCancellation, date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={newCancellation.reason} onChange={(e) => setNewCancellation({ ...newCancellation, reason: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select reason</option>
                  {cancellationReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age Group</label>
                <select value={newCancellation.age_group} onChange={(e) => setNewCancellation({ ...newCancellation, age_group: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(age => <option key={age} value={age}>{age}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={newCancellation.notes} onChange={(e) => setNewCancellation({ ...newCancellation, notes: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewCancellation({ month: '', name: '', date: '', reason: '', age_group: '', notes: '' }); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCancellation} disabled={!newCancellation.name || !newCancellation.month} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Add Cancellation</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingCancellation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl font-bold mb-4">Edit Cancellation</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={editingCancellation.month} onChange={(e) => setEditingCancellation({ ...editingCancellation, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={editingCancellation.name} onChange={(e) => setEditingCancellation({ ...editingCancellation, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={editingCancellation.date || ''} onChange={(e) => setEditingCancellation({ ...editingCancellation, date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={editingCancellation.reason} onChange={(e) => setEditingCancellation({ ...editingCancellation, reason: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select reason</option>
                  {cancellationReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age Group</label>
                <select value={editingCancellation.age_group || ''} onChange={(e) => setEditingCancellation({ ...editingCancellation, age_group: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(age => <option key={age} value={age}>{age}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={editingCancellation.notes || ''} onChange={(e) => setEditingCancellation({ ...editingCancellation, notes: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingCancellation(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
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
                    <th className="px-4 py-2 text-left">Date</th>
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
                      <td className="px-4 py-2">{row.date || '-'}</td>
                      <td className="px-4 py-2">{row.reason}</td>
                      <td className="px-4 py-2">
                        {cancellations.some(c => c.name.toLowerCase().trim() === row.name.toLowerCase().trim() && c.month === row.month && c.date === row.date) ? (
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
              <h3 className="text-xl font-bold">Manage Cancellation Reasons</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Reason</label>
                <div className="flex gap-2">
                  <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addReason()} placeholder="Enter cancellation reason" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                  <button onClick={addReason} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 mb-3">Current Reasons ({cancellationReasons.length})</h4>
                {cancellationReasons.map((reason, index) => (
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