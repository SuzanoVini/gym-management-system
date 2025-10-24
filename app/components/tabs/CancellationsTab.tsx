'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Plus, Edit2, Trash2, CheckSquare, Square, Settings, X } from 'lucide-react';
import Papa from 'papaparse';
import { fetchCancellations, createCancellation, updateCancellation, deleteCancellation, fetchSettings, updateSettings } from '../../lib/supabase/client';

interface Cancellation {
  id: string;
  month: string;
  name: string;
  cancellation_date?: string;
  reason?: string;
  age_category?: string;
  notes?: string;
  [key: string]: any;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  
  // Settings from database
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [ageCategories, setAgeCategories] = useState<string[]>([]);
  const [settingsTab, setSettingsTab] = useState<'reasons' | 'ages'>('reasons');
  
  const [newReason, setNewReason] = useState('');
  const [editingReasonIndex, setEditingReasonIndex] = useState<number | null>(null);
  const [newAgeCategory, setNewAgeCategory] = useState('');
  const [editingAgeCategoryIndex, setEditingAgeCategoryIndex] = useState<number | null>(null);

  const [newCancellation, setNewCancellation] = useState({
    month: '',
    name: '',
    cancellation_date: '',
    reason: '',
    age_category: '',
    notes: '',
  });

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterAgeCategory, setFilterAgeCategory] = useState('all');

  useEffect(() => {
    loadCancellations();
    loadSettings();
  }, []);

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
    const ages = await fetchSettings('age_categories');
    if (reasons) setCancellationReasons(reasons);
    if (ages) setAgeCategories(ages);
  };

  // Cancellation Reasons Management
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

  // Age Categories Management
  const addAgeCategory = async () => {
    if (newAgeCategory.trim() && !ageCategories.includes(newAgeCategory.trim())) {
      const updated = [...ageCategories, newAgeCategory.trim()].sort();
      setAgeCategories(updated);
      
      try {
        await updateSettings('age_categories', updated);
        setNewAgeCategory('');
      } catch (error) {
        console.error('Error saving age category:', error);
        alert('Failed to save age category');
      }
    }
  };

  const deleteAgeCategory = async (index: number) => {
    if (confirm('Are you sure you want to delete this age category?')) {
      const updated = ageCategories.filter((_, i) => i !== index);
      setAgeCategories(updated);
      
      try {
        await updateSettings('age_categories', updated);
      } catch (error) {
        console.error('Error deleting age category:', error);
        alert('Failed to delete age category');
      }
    }
  };

  const updateAgeCategory = async (index: number, newValue: string) => {
    const updated = [...ageCategories];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setAgeCategories(sorted);
    setEditingAgeCategoryIndex(null);
    
    try {
      await updateSettings('age_categories', sorted);
    } catch (error) {
      console.error('Error updating age category:', error);
      alert('Failed to update age category');
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
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
              if (!isNaN(Number(name)) && name.length < 4) return false;
              return true;
            })
            .map((row: any) => ({
              month: String(row.MONTH || row.month || row.Month || '').trim(),
              name: String(row.NAME || row.name || row.Name || '').trim(),
              cancellation_date: String(row.DATE || row.date || row.Date || row['Cancellation Date'] || '').trim(),
              reason: String(row.REASON || row.reason || row.Reason || '').trim(),
              age_category: String(row['AGE CATEGORY'] || row.age_category || row['Age Category'] || '').trim(),
              notes: String(row.NOTES || row.notes || row.Notes || '').trim(),
            }));

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
    try {
      let successCount = 0;
      let duplicateCount = 0;

      for (const row of importPreviewData) {
        const isDuplicate = cancellations.some(c => 
          c.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
          c.month === row.month
        );

        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        await createCancellation(row);
        successCount++;
      }

      await loadCancellations();
      setShowImportPreview(false);
      setImportPreviewData([]);
      alert(`Imported ${successCount} records. ${duplicateCount} duplicates skipped.`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Error importing CSV');
    }
  };

  const handleAddCancellation = async () => {
    if (!newCancellation.name || !newCancellation.month) {
      alert('Please fill in required fields: Name and Month');
      return;
    }

    try {
      await createCancellation(newCancellation);
      await loadCancellations();
      setShowAddModal(false);
      setNewCancellation({ month: '', name: '', cancellation_date: '', reason: '', age_category: '', notes: '' });
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

    if (!confirm(`Delete ${selectedIds.size} selected cancellations?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteCancellation(id);
      }
      await loadCancellations();
      setSelectedIds(new Set());
      alert(`Deleted ${selectedIds.size} cancellations`);
    } catch (error) {
      console.error('Error deleting cancellations:', error);
    }
  };

  const handleEditSave = async () => {
    if (!editingCancellation) return;

    try {
      await updateCancellation(editingCancellation.id, editingCancellation);
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
    if (selectedIds.size === filteredCancellations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCancellations.map(c => c.id)));
    }
  };

  const months = [...new Set(cancellations.map(c => c.month))].filter(Boolean);

  const filteredCancellations = cancellations.filter(cancellation => {
    if (filterMonth !== 'all' && cancellation.month !== filterMonth) return false;
    if (filterReason !== 'all' && cancellation.reason !== filterReason) return false;
    if (filterAgeCategory !== 'all' && cancellation.age_category !== filterAgeCategory) return false;
    return true;
  });

  // Get reason breakdown
  const reasonCounts = filteredCancellations.reduce((acc, c) => {
    const reason = c.reason || 'Unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const metrics = {
    total: filteredCancellations.length,
    noTime: filteredCancellations.filter(c => c.reason === 'No time').length,
    moving: filteredCancellations.filter(c => c.reason === 'Moving').length,
    injury: filteredCancellations.filter(c => c.reason === 'Injury').length,
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cancellations</h2>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowSettingsModal(true)} 
            className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-600 text-gray-600 rounded font-medium hover:bg-gray-50"
          >
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

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Total Cancellations</div>
          <div className="text-3xl font-bold mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">No Time</div>
          <div className="text-3xl font-bold mt-1">{metrics.noTime}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Moving</div>
          <div className="text-3xl font-bold mt-1">{metrics.moving}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-600">
          <div className="text-sm text-gray-600">Injury/Medical</div>
          <div className="text-3xl font-bold mt-1">{metrics.injury}</div>
        </div>
      </div>

      {/* Top Reasons Card */}
      {topReasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-3">Top Cancellation Reasons</h3>
          <div className="space-y-2">
            {topReasons.map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{reason}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${(count / metrics.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Age Category</label>
            <select value={filterAgeCategory} onChange={(e) => setFilterAgeCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Ages</option>
              {ageCategories.map(age => <option key={age} value={age}>{age}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">All Cancellations ({filteredCancellations.length})</h3>
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
                  <button onClick={toggleSelectAll} className="flex items-center space-x-1">
                    {selectedIds.size === filteredCancellations.length && filteredCancellations.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCancellations.map((cancellation) => (
                <tr key={cancellation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelection(cancellation.id)}>
                      {selectedIds.has(cancellation.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{cancellation.month}</td>
                  <td className="px-6 py-4 text-sm font-medium">{cancellation.name}</td>
                  <td className="px-6 py-4 text-sm">{cancellation.cancellation_date || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    {cancellation.reason ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {cancellation.reason}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{cancellation.age_category || '-'}</td>
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '48rem', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Manage Cancellation Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
              <button
                onClick={() => setSettingsTab('reasons')}
                className={`px-4 py-2 font-medium ${
                  settingsTab === 'reasons'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600'
                }`}
              >
                Cancellation Reasons
              </button>
              <button
                onClick={() => setSettingsTab('ages')}
                className={`px-4 py-2 font-medium ${
                  settingsTab === 'ages'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600'
                }`}
              >
                Age Categories
              </button>
            </div>

            {/* Reasons Tab */}
            {settingsTab === 'reasons' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Cancellation Reason
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addReason()}
                      placeholder="Enter reason"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={addReason}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 mb-3">Current Reasons ({cancellationReasons.length})</h4>
                  {cancellationReasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingReasonIndex === index ? (
                        <input
                          type="text"
                          defaultValue={reason}
                          onBlur={(e) => updateReason(index, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateReason(index, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">{reason}</span>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingReasonIndex(index)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteReason(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Age Categories Tab */}
            {settingsTab === 'ages' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Age Category
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAgeCategory}
                      onChange={(e) => setNewAgeCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAgeCategory()}
                      placeholder="Enter age category"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={addAgeCategory}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 mb-3">Current Age Categories ({ageCategories.length})</h4>
                  {ageCategories.map((age, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingAgeCategoryIndex === index ? (
                        <input
                          type="text"
                          defaultValue={age}
                          onBlur={(e) => updateAgeCategory(index, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateAgeCategory(index, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">{age}</span>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAgeCategoryIndex(index)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAgeCategory(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto'
          }}>
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
                <label className="block text-sm font-medium mb-1">Cancellation Date</label>
                <input type="date" value={newCancellation.cancellation_date} onChange={(e) => setNewCancellation({ ...newCancellation, cancellation_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={newCancellation.reason} onChange={(e) => setNewCancellation({ ...newCancellation, reason: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select reason</option>
                  {cancellationReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age Category</label>
                <select value={newCancellation.age_category} onChange={(e) => setNewCancellation({ ...newCancellation, age_category: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select age</option>
                  {ageCategories.map(age => <option key={age} value={age}>{age}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={newCancellation.notes} onChange={(e) => setNewCancellation({ ...newCancellation, notes: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewCancellation({ month: '', name: '', cancellation_date: '', reason: '', age_category: '', notes: '' }); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCancellation} disabled={!newCancellation.name || !newCancellation.month} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Add Cancellation</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCancellation && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto'
          }}>
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
                <label className="block text-sm font-medium mb-1">Cancellation Date</label>
                <input type="date" value={editingCancellation.cancellation_date || ''} onChange={(e) => setEditingCancellation({ ...editingCancellation, cancellation_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={editingCancellation.reason || ''} onChange={(e) => setEditingCancellation({ ...editingCancellation, reason: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select reason</option>
                  {cancellationReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age Category</label>
                <select value={editingCancellation.age_category || ''} onChange={(e) => setEditingCancellation({ ...editingCancellation, age_category: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select age</option>
                  {ageCategories.map(age => <option key={age} value={age}>{age}</option>)}
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

      {/* CSV Import Preview Modal */}
      {showImportPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '64rem', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h3 className="text-xl font-bold mb-4">Confirm CSV Import</h3>
            <p className="text-sm text-gray-600 mb-4">Review {importPreviewData.length} records:</p>
            <div className="border rounded overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Month</th>
                    <th className="px-4 py-2 text-left">Name</th>
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
                      <td className="px-4 py-2">{row.reason}</td>
                      <td className="px-4 py-2">
                        {cancellations.some(c => c.name.toLowerCase().trim() === row.name.toLowerCase().trim() && c.month === row.month) ? (
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
    </div>
  );
}