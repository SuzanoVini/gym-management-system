'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Plus, Edit2, Trash2, CheckSquare, Square, Settings, X } from 'lucide-react';
import Papa from 'papaparse';
import { fetchSignups, createSignup, updateSignup, deleteSignup, fetchSettings, updateSettings, supabase } from '../../lib/supabase/client';

interface Signup {
  id: string;
  month: string;
  name: string;
  membership: string;
  membership_date?: string;
  first_payment_date?: string;
  signup_package: boolean;
  notes?: string;
  created_at?: string;
  [key: string]: any;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SignupsTab() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSignup, setEditingSignup] = useState<Signup | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [membershipTypes, setMembershipTypes] = useState<string[]>([]);
  const [newMembershipType, setNewMembershipType] = useState('');
  const [editingMembershipIndex, setEditingMembershipIndex] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [newSignup, setNewSignup] = useState({
    month: '',
    name: '',
    membership: '',
    membership_date: '',
    first_payment_date: '',
    signup_package: false,
    notes: '',
  });

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterMembership, setFilterMembership] = useState('all');

  useEffect(() => {
    loadSignups();
    loadSettings();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterMembership, sortOrder]);

  const loadSignups = async () => {
    try {
      setLoading(true);
      const data = await fetchSignups();
      setSignups(data);
    } catch (error) {
      console.error('Error loading signups:', error);
      alert('Error loading signups');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const types = await fetchSettings('membership_types');
    if (types) setMembershipTypes(types);
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
              return true;
            })
            .map((row: any) => ({
              month: String(row.MONTH || row.month || row.Month || '').trim(),
              name: String(row.NAME || row.name || row.Name || '').trim(),
              membership: String(row.MEMBERSHIP || row.membership || row.Membership || '').trim(),
              membership_date: String(row['MEMBERSHIP DATE'] || row.membership_date || row['Membership Date'] || '').trim() || null,
              first_payment_date: String(row['1ST PAYMENT DATE'] || row.first_payment_date || row['First Payment Date'] || '').trim() || null,
              signup_package: String(row['SIGN-UP PACKAGE?'] || row.signup_package || row['Signup Package'] || '').toLowerCase().includes('yes'),
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
    if (!importPreviewData || importPreviewData.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      setLoading(true);

      const newRecords = importPreviewData
        .filter(row => {
          if (!row.name || !row.month) return false;
          const isDuplicate = signups.some(s =>
            s.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
            s.month === row.month
          );
          return !isDuplicate;
        })
        .map(row => ({
          ...row,
          membership_date: row.membership_date || null,
          first_payment_date: row.first_payment_date || null,
        }));

      const duplicateCount = importPreviewData.length - newRecords.length;

      if (newRecords.length === 0) {
        alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
        setShowImportPreview(false);
        setImportPreviewData([]);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('signups').insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await loadSignups();
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

  const handleAddSignup = async () => {
    if (!newSignup.name || !newSignup.month || !newSignup.membership) {
      alert('Please fill in required fields: Name, Month, and Membership Type');
      return;
    }

    try {
      const signupData = {
        ...newSignup,
        membership_date: newSignup.membership_date || null,
        first_payment_date: newSignup.first_payment_date || null,
      };

      await createSignup(signupData);
      await loadSignups();
      setShowAddModal(false);
      setNewSignup({ month: '', name: '', membership: '', membership_date: '', first_payment_date: '', signup_package: false, notes: '' });
      alert('Sign-up added successfully!');
    } catch (error) {
      console.error('Error adding signup:', error);
      alert('Error adding signup');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete sign-up for ${name}?`)) return;
    try {
      await deleteSignup(id);
      await loadSignups();
    } catch (error) {
      console.error('Error deleting signup:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select sign-ups to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected sign-ups?`)) return;

    try {
      setLoading(true);
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('signups').delete().in('id', batch);
        if (error) throw error;
      }

      await loadSignups();
      setSelectedIds(new Set());
      setCurrentPage(1);
      alert(`✅ Deleted ${idsToDelete.length} sign-ups`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting sign-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingSignup) return;
    try {
      const signupData = {
        ...editingSignup,
        membership_date: editingSignup.membership_date || null,
        first_payment_date: editingSignup.first_payment_date || null,
      };
      await updateSignup(editingSignup.id, signupData);
      await loadSignups();
      setShowEditModal(false);
      setEditingSignup(null);
      alert('Sign-up updated!');
    } catch (error) {
      console.error('Error updating signup:', error);
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
    const currentPageIds = paginatedSignups.map(signup => signup.id);
    const allCurrentSelected = currentPageIds.every(id => selectedIds.has(id));
    const newSelected = new Set(selectedIds);
    if (allCurrentSelected) {
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      currentPageIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const addMembershipType = async () => {
    if (newMembershipType.trim() && !membershipTypes.includes(newMembershipType.trim())) {
      const updated = [...membershipTypes, newMembershipType.trim()].sort();
      setMembershipTypes(updated);
      try {
        await updateSettings('membership_types', updated);
        setNewMembershipType('');
      } catch (error) {
        console.error('Error saving membership type:', error);
        alert('Failed to save membership type');
      }
    }
  };

  const deleteMembershipType = async (index: number) => {
    if (confirm('Are you sure you want to delete this membership type?')) {
      const updated = membershipTypes.filter((_, i) => i !== index);
      setMembershipTypes(updated);
      try {
        await updateSettings('membership_types', updated);
      } catch (error) {
        console.error('Error deleting membership type:', error);
        alert('Failed to delete membership type');
      }
    }
  };

  const updateMembershipType = async (index: number, newValue: string) => {
    const updated = [...membershipTypes];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setMembershipTypes(sorted);
    setEditingMembershipIndex(null);
    try {
      await updateSettings('membership_types', sorted);
    } catch (error) {
      console.error('Error updating membership type:', error);
      alert('Failed to update membership type');
    }
  };

  const months = [...new Set(signups.map(s => s.month))].filter(Boolean);

  const filteredSignups = signups.filter(signup => {
    if (filterMonth !== 'all' && signup.month !== filterMonth) return false;
    if (filterMembership !== 'all' && signup.membership !== filterMembership) return false;
    return true;
  });

  const sortedSignups = [...filteredSignups].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(sortedSignups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSignups = sortedSignups.slice(startIndex, endIndex);

  const metrics = {
    total: filteredSignups.length,
    integrity: filteredSignups.filter(s => s.membership === 'Integrity').length,
    legacy: filteredSignups.filter(s => s.membership === 'Legacy').length,
    special: filteredSignups.filter(s => s.membership === 'Special').length,
    asp: filteredSignups.filter(s => s.membership === 'ASP').length,
    withPackage: filteredSignups.filter(s => s.signup_package).length,
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
        <h2 className="text-2xl font-bold">Sign-ups</h2>
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
            <span>Add Sign-up</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Sign-ups</div>
          <div className="text-3xl font-bold mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Integrity</div>
          <div className="text-3xl font-bold mt-1">{metrics.integrity}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-600">
          <div className="text-sm text-gray-600">Legacy</div>
          <div className="text-3xl font-bold mt-1">{metrics.legacy}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">Special</div>
          <div className="text-3xl font-bold mt-1">{metrics.special}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600">
          <div className="text-sm text-gray-600">ASP</div>
          <div className="text-3xl font-bold mt-1">{metrics.asp}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-600">
          <div className="text-sm text-gray-600">With Package</div>
          <div className="text-3xl font-bold mt-1">{metrics.withPackage}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Membership Type</label>
            <select value={filterMembership} onChange={(e) => setFilterMembership(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Types</option>
              {membershipTypes.map(type => <option key={type} value={type}>{type}</option>)}
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
            Showing {startIndex + 1}-{Math.min(endIndex, sortedSignups.length)} of {sortedSignups.length}
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
          <h3 className="text-lg font-semibold">All Sign-ups ({sortedSignups.length})</h3>
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
                    {paginatedSignups.length > 0 && paginatedSignups.every(signup => selectedIds.has(signup.id)) ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membership Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedSignups.map((signup) => (
                <tr key={signup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelection(signup.id)}>
                      {selectedIds.has(signup.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{signup.month}</td>
                  <td className="px-6 py-4 text-sm font-medium">{signup.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${signup.membership === 'Integrity' ? 'bg-green-100 text-green-800' :
                      signup.membership === 'Legacy' ? 'bg-purple-100 text-purple-800' :
                        signup.membership === 'Special' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {signup.membership}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{signup.membership_date || '-'}</td>
                  <td className="px-6 py-4 text-sm">{signup.first_payment_date || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    {signup.signup_package ? <span className="text-green-600 font-medium">✓ Yes</span> : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{signup.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button onClick={() => { setEditingSignup({ ...signup }); setShowEditModal(true); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(signup.id, signup.name)} className="text-red-600 hover:text-red-800" title="Delete">
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
            <h3 className="text-xl font-bold mb-4">Add New Sign-up</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month *</label>
                <select value={newSignup.month} onChange={(e) => setNewSignup({ ...newSignup, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select month</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={newSignup.name} onChange={(e) => setNewSignup({ ...newSignup, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Membership Type *</label>
                <select value={newSignup.membership} onChange={(e) => setNewSignup({ ...newSignup, membership: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select type</option>
                  {membershipTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Membership Date</label>
                <input type="date" value={newSignup.membership_date} onChange={(e) => setNewSignup({ ...newSignup, membership_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">First Payment Date</label>
                <input type="date" value={newSignup.first_payment_date} onChange={(e) => setNewSignup({ ...newSignup, first_payment_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={newSignup.signup_package} onChange={(e) => setNewSignup({ ...newSignup, signup_package: e.target.checked })} className="rounded" />
                  <span className="text-sm font-medium">Sign-up Package</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={newSignup.notes} onChange={(e) => setNewSignup({ ...newSignup, notes: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewSignup({ month: '', name: '', membership: '', membership_date: '', first_payment_date: '', signup_package: false, notes: '' }); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddSignup} disabled={!newSignup.name || !newSignup.month || !newSignup.membership} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Add Sign-up</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingSignup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl font-bold mb-4">Edit Sign-up</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={editingSignup.month} onChange={(e) => setEditingSignup({ ...editingSignup, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={editingSignup.name} onChange={(e) => setEditingSignup({ ...editingSignup, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Membership Type</label>
                <select value={editingSignup.membership} onChange={(e) => setEditingSignup({ ...editingSignup, membership: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select type</option>
                  {membershipTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Membership Date</label>
                <input type="date" value={editingSignup.membership_date || ''} onChange={(e) => setEditingSignup({ ...editingSignup, membership_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">First Payment Date</label>
                <input type="date" value={editingSignup.first_payment_date || ''} onChange={(e) => setEditingSignup({ ...editingSignup, first_payment_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={editingSignup.signup_package} onChange={(e) => setEditingSignup({ ...editingSignup, signup_package: e.target.checked })} className="rounded" />
                  <span className="text-sm font-medium">Sign-up Package</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={editingSignup.notes || ''} onChange={(e) => setEditingSignup({ ...editingSignup, notes: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingSignup(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
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
                    <th className="px-4 py-2 text-left">Membership</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importPreviewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{row.month}</td>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{row.membership}</td>
                      <td className="px-4 py-2">
                        {signups.some(s => s.name.toLowerCase().trim() === row.name.toLowerCase().trim() && s.month === row.month) ? (
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
              <h3 className="text-xl font-bold">Manage Membership Types</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Membership Type</label>
                <div className="flex gap-2">
                  <input type="text" value={newMembershipType} onChange={(e) => setNewMembershipType(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addMembershipType()} placeholder="Enter membership type" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                  <button onClick={addMembershipType} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 mb-3">Current Membership Types ({membershipTypes.length})</h4>
                {membershipTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    {editingMembershipIndex === index ? (
                      <input type="text" defaultValue={type} onBlur={(e) => updateMembershipType(index, e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { updateMembershipType(index, (e.target as HTMLInputElement).value); } }} className="flex-1 px-2 py-1 border border-gray-300 rounded" autoFocus />
                    ) : (
                      <span className="flex-1">{type}</span>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setEditingMembershipIndex(index)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMembershipType(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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