'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Plus, Mail, Phone, MessageSquare, Edit2, Trash2, CheckSquare, Square, Settings, X } from 'lucide-react';
import Papa from 'papaparse';
import { fetchIntros, createIntro, updateIntro, deleteIntro, createFollowUpNote, fetchSettings, updateSettings, supabase } from '../../lib/supabase/client';

interface Intro {
  id: string;
  month: string;
  date: number;
  time?: string;
  class: string;
  name: string;
  email?: string;
  phone?: string;
  staff: string;
  attended?: string;
  signed_up?: string;
  follow_up_notes?: any[] | null;
  [key: string]: any;
}

export default function IntrosTab() {
  const [intros, setIntros] = useState<Intro[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [editingIntro, setEditingIntro] = useState<Intro | null>(null);
  const [followUpIntro, setFollowUpIntro] = useState<Intro | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
  const [editingStaffIndex, setEditingStaffIndex] = useState<number | null>(null);
  const [settingsTab, setSettingsTab] = useState<'classes' | 'staff'>('classes');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [newIntro, setNewIntro] = useState({
    month: '',
    date: '',
    time: '',
    class: '',
    name: '',
    email: '',
    phone: '',
    staff: '',
    attended: '',
    signed_up: '',
  });

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadIntros();
  }, []);

  const loadIntros = async () => {
    try {
      setLoading(true);
      const data = await fetchIntros();
      setIntros(data);
    } catch (error) {
      console.error('Error loading intros:', error);
      alert('Error loading intros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      const classes = await fetchSettings('class_types');
      const staff = await fetchSettings('staff_members');

      if (classes) setClassTypes(classes);
      if (staff) setStaffMembers(staff);
    }

    loadSettings();
  }, []);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterStaff, filterClass, filterStatus, sortOrder]);

  const checkDuplicate = (name: string, date: number, month: string, classType: string, excludeId?: string): boolean => {
    return intros.some(intro =>
      intro.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      intro.date === date &&
      intro.month === month &&
      intro.class === classType &&
      intro.id !== excludeId
    );
  };

  const removeDuplicatesFromImport = (data: any[]): any[] => {
    const seen = new Set<string>();
    return data.filter(item => {
      const key = `${item.name.toLowerCase().trim()}_${item.month}_${item.date}_${item.class}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
              month: String(row.Month || row.month || '').trim(),
              date: parseInt(String(row.Date || row.date || '0')) || 0,
              time: String(row.Time || row.time || '').trim(),
              class: String(row.Class || row.class || '').trim(),
              name: String(row.NAME || row.name || row.Name || '').trim(),
              email: String(row.Email || row.email || '').trim(),
              phone: String(row.Phone || row.phone || '').trim(),
              staff: String(row.STAFF || row.staff || row.Staff || '').trim(),
              attended: String(row['ATTENDED?'] || row.attended || row.Attended || '').trim(),
              signed_up: String(row['SIGNED UP?'] || row.signed_up || row['Signed Up'] || '').trim(),
            }));

          setImportPreviewData(parsedData);  // Change from setPreviewData
          setShowImportPreview(true);        // Add this line
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

      // Filter out duplicates
      const newRecords = importPreviewData.filter(row => {
        if (!row.name || !row.month) return false;

        const isDuplicate = intros.some(intro =>
          intro.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
          intro.date === row.date &&
          intro.month === row.month &&
          intro.class === row.class
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

      // BULK INSERT
      const { data, error } = await supabase
        .from('intros')
        .insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await loadIntros();
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

  const handleAddIntro = async () => {
    if (!newIntro.name || !newIntro.month || !newIntro.date) {
      alert('Please fill in required fields: Name, Month, and Date');
      return;
    }

    if (checkDuplicate(newIntro.name, parseInt(newIntro.date), newIntro.month, newIntro.class)) {
      alert('This intro already exists');
      return;
    }

    try {
      await createIntro({
        ...newIntro,
        date: parseInt(newIntro.date),
      });
      await loadIntros();
      setShowAddModal(false);
      setNewIntro({ month: '', date: '', time: '', class: '', name: '', email: '', phone: '', staff: '', attended: '', signed_up: '' });
      alert('Intro added successfully!');
    } catch (error) {
      console.error('Error adding intro:', error);
      alert('Error adding intro');
    }
  };

  const handleStatusUpdate = async (id: string, field: string, value: string) => {
    try {
      await updateIntro(id, { [field]: value });
      await loadIntros();
    } catch (error) {
      console.error('Error updating intro:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete intro for ${name}?`)) return;

    try {
      await deleteIntro(id);
      await loadIntros();
    } catch (error) {
      console.error('Error deleting intro:', error);
    }
  };

  const handleEmailImport = () => {
    try {
      const text = emailInput.trim();

      // Parse the email content
      const typeMatch = text.match(/Type:\s*(.+)/i);
      const dateMatch = text.match(/Date:\s*(.+)/i);
      const timeMatch = text.match(/Time:\s*(.+)/i);
      const staffMatch = text.match(/Staff:\s*(.+)/i);
      const nameMatch = text.match(/Name:\s*(.+)/i);
      const phoneMatch = text.match(/Phone:\s*(.+)/i);
      const emailMatch = text.match(/Email:\s*(.+)/i);

      if (!nameMatch) {
        alert('Could not find name in email. Please check the format.');
        return;
      }

      // Parse the date
      let month = '';
      let date = 0;

      if (dateMatch) {
        const dateStr = dateMatch[1].trim();
        const parsedDate = new Date(dateStr);

        if (!isNaN(parsedDate.getTime())) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          month = monthNames[parsedDate.getMonth()];
          date = parsedDate.getDate();
        }
      }

      // Smart class matching
      let matchedClass = '';
      if (typeMatch) {
        const typeText = typeMatch[1].trim().toLowerCase();

        // Try exact match first
        const exactMatch = classTypes.find(cls => cls.toLowerCase() === typeText);
        if (exactMatch) {
          matchedClass = exactMatch;
        } else {
          // Try fuzzy matching - find class that contains key words
          const matchedByKeywords = classTypes.find(cls => {
            const clsLower = cls.toLowerCase();

            // Check for age ranges
            if (typeText.includes('juniors') && clsLower.includes('juniors')) return true;
            if (typeText.includes('teens') && clsLower.includes('teens')) return true;
            if (typeText.includes('3') && typeText.includes('6') && clsLower.includes('3') && clsLower.includes('6')) return true;
            if (typeText.includes('7') && typeText.includes('9') && clsLower.includes('7') && clsLower.includes('9')) return true;
            if (typeText.includes('kids') && clsLower.includes('kids')) return true;
            if (typeText.includes('women') && clsLower.includes('women')) return true;
            if (typeText.includes('muay thai') && clsLower.includes('muay thai')) return true;
            if (typeText.includes('no gi') && clsLower.includes('no gi')) return true;
            if (typeText.includes('gb1') && clsLower.includes('gb1')) return true;
            if (typeText.includes('gb2') && clsLower.includes('gb2')) return true;
            if (typeText.includes('gb 1/2') && clsLower.includes('gb 1/2')) return true;
            if (typeText.includes('wrestling') && clsLower.includes('wrestling')) return true;
            if (typeText.includes('judo') && clsLower.includes('judo')) return true;
            if (typeText.includes('parents') && clsLower.includes('parents')) return true;

            return false;
          });

          if (matchedByKeywords) {
            matchedClass = matchedByKeywords;
          } else {
            // If no match, just use the original text
            matchedClass = typeMatch[1].trim();
          }
        }
      }

      // Smart staff matching
      let matchedStaff = '';
      if (staffMatch) {
        const staffText = staffMatch[1].trim();

        // Try exact match first (case-insensitive)
        const exactMatch = staffMembers.find(staff =>
          staff.toLowerCase() === staffText.toLowerCase()
        );

        if (exactMatch) {
          matchedStaff = exactMatch;
        } else {
          // Try partial matching (first name or last name)
          const partialMatch = staffMembers.find(staff => {
            const staffLower = staff.toLowerCase();
            const textLower = staffText.toLowerCase();

            // Check if staff name contains the text or vice versa
            return staffLower.includes(textLower) || textLower.includes(staffLower);
          });

          if (partialMatch) {
            matchedStaff = partialMatch;
          } else {
            // If no match, just use the original text
            matchedStaff = staffText;
          }
        }
      }

      // Create the intro object
      const introData = {
        month: month,
        date: date.toString(),
        time: timeMatch ? timeMatch[1].trim() : '',
        class: matchedClass,
        name: nameMatch[1].trim(),
        email: emailMatch ? emailMatch[1].trim() : '',
        phone: phoneMatch ? phoneMatch[1].trim() : '',
        staff: matchedStaff,
        attended: '',
        signed_up: '',
      };

      // Check if we have minimum required data
      if (!introData.name || !introData.month || !introData.date) {
        alert('Missing required fields (Name, Month, or Date). Please add them manually.');
        return;
      }

      // Check for duplicates
      if (checkDuplicate(introData.name, parseInt(introData.date), introData.month, introData.class)) {
        alert('This intro already exists in the system.');
        return;
      }

      // Open the add modal with pre-filled data
      setNewIntro(introData);
      setShowEmailModal(false);
      setShowAddModal(true);
      setEmailInput('');

    } catch (error) {
      console.error('Error parsing email:', error);
      alert('Error parsing email content. Please check the format or add manually.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select intros to delete');
      return;
    }

    if (!confirm(`Delete ${selectedIds.size} selected intros?`)) return;

    try {
      setLoading(true);

      console.log('Deleting IDs:', Array.from(selectedIds));

      // Convert Set to Array for the query
      const idsToDelete = Array.from(selectedIds);

      // BULK DELETE
      const { data, error, status, statusText } = await supabase
        .from('intros')
        .delete()
        .in('id', idsToDelete);

      console.log('Delete response:', { data, error, status, statusText });

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Error deleting: ${error.message || 'Unknown error'}`);
      } else {
        await loadIntros();
        setSelectedIds(new Set());
        setCurrentPage(1); // ADD THIS LINE
        alert(`✅ Deleted ${idsToDelete.length} intros`);
      }
    } catch (error) {
      console.error('Caught error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingIntro) return;

    if (checkDuplicate(editingIntro.name, editingIntro.date, editingIntro.month, editingIntro.class, editingIntro.id)) {
      alert('An intro with this name, date, and class already exists');
      return;
    }

    try {
      await updateIntro(editingIntro.id, editingIntro);
      await loadIntros();
      setShowEditModal(false);
      setEditingIntro(null);
      alert('Intro updated!');
    } catch (error) {
      console.error('Error updating intro:', error);
    }
  };

  const handleFollowUpSave = async () => {
    if (!followUpIntro) return;

    try {
      await createFollowUpNote({
        intro_id: followUpIntro.id,
        note: followUpNote,
        staff_name: 'Current User',
      });
      await loadIntros();
      setShowFollowUpModal(false);
      setFollowUpIntro(null);
      setFollowUpNote('');
      alert('Follow-up note added!');
    } catch (error) {
      console.error('Error saving follow-up:', error);
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
    const currentPageIds = paginatedIntros.map(intro => intro.id);
    const allCurrentSelected = currentPageIds.every(id => selectedIds.has(id));

    const newSelected = new Set(selectedIds);

    if (allCurrentSelected) {
      // Deselect all on current page
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all on current page
      currentPageIds.forEach(id => newSelected.add(id));
    }

    setSelectedIds(newSelected);
  };

  const months = [...new Set(intros.map(i => i.month))].filter(Boolean);

  const addClassType = async () => {
    if (newClassName.trim() && !classTypes.includes(newClassName.trim())) {
      const updated = [...classTypes, newClassName.trim()].sort();
      setClassTypes(updated);

      try {
        await updateSettings('class_types', updated);
        setNewClassName('');
      } catch (error) {
        console.error('Error saving class type:', error);
        alert('Failed to save class type');
      }
    }
  };

  const deleteClassType = async (index: number) => {
    if (confirm('Are you sure you want to delete this class type?')) {
      const updated = classTypes.filter((_, i) => i !== index);
      setClassTypes(updated);

      try {
        await updateSettings('class_types', updated);
      } catch (error) {
        console.error('Error deleting class type:', error);
        alert('Failed to delete class type');
      }
    }
  };

  const updateClassType = async (index: number, newValue: string) => {
    const updated = [...classTypes];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setClassTypes(sorted);
    setEditingClassIndex(null);

    try {
      await updateSettings('class_types', sorted);
    } catch (error) {
      console.error('Error updating class type:', error);
      alert('Failed to update class type');
    }
  };

  const addStaffMember = async () => {
    if (newStaffName.trim() && !staffMembers.includes(newStaffName.trim())) {
      const updated = [...staffMembers, newStaffName.trim()].sort();
      setStaffMembers(updated);

      try {
        await updateSettings('staff_members', updated);
        setNewStaffName('');
      } catch (error) {
        console.error('Error saving staff member:', error);
        alert('Failed to save staff member');
      }
    }
  };

  const deleteStaffMember = async (index: number) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      const updated = staffMembers.filter((_, i) => i !== index);
      setStaffMembers(updated);

      try {
        await updateSettings('staff_members', updated);
      } catch (error) {
        console.error('Error deleting staff member:', error);
        alert('Failed to delete staff member');
      }
    }
  };

  const updateStaffMember = async (index: number, newValue: string) => {
    const updated = [...staffMembers];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setStaffMembers(sorted);
    setEditingStaffIndex(null);

    try {
      await updateSettings('staff_members', sorted);
    } catch (error) {
      console.error('Error updating staff member:', error);
      alert('Failed to update staff member');
    }
  };

  const filteredIntros = intros.filter(intro => {
    if (filterMonth !== 'all' && intro.month !== filterMonth) return false;
    if (filterStaff !== 'all' && intro.staff !== filterStaff) return false;
    if (filterClass !== 'all' && intro.class !== filterClass) return false;
    if (filterStatus === 'needs-followup' && (intro.attended !== 'Yes' || intro.signed_up === 'Yes')) return false;
    if (filterStatus === 'attended' && intro.attended !== 'Yes') return false;
    if (filterStatus === 'not-attended' && intro.attended !== 'No') return false;
    if (filterStatus === 'signed-up' && intro.signed_up !== 'Yes') return false;
    return true;
  });

  // Sort filtered intros by intro date
  const sortedIntros = [...filteredIntros].sort((a, b) => {
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthA = monthOrder.indexOf(a.month);
    const monthB = monthOrder.indexOf(b.month);

    // First compare by month
    if (monthA !== monthB) {
      return sortOrder === 'newest' ? monthB - monthA : monthA - monthB;
    }

    // If same month, compare by date
    return sortOrder === 'newest' ? b.date - a.date : a.date - b.date;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedIntros.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIntros = sortedIntros.slice(startIndex, endIndex);
  const metrics = {
    total: filteredIntros.length,
    attended: filteredIntros.filter(i => i.attended === 'Yes').length,
    signedUp: filteredIntros.filter(i => i.signed_up === 'Yes').length,
    needsFollowUp: filteredIntros.filter(i => i.attended === 'Yes' && i.signed_up !== 'Yes').length,
  };

  const attendanceRate = metrics.total > 0 ? Math.round((metrics.attended / metrics.total) * 100) : 0;
  const conversionRate = metrics.attended > 0 ? Math.round((metrics.signedUp / metrics.attended) * 100) : 0;

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
        <h2 className="text-2xl font-bold">Intro Classes</h2>
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
          <button onClick={() => setShowEmailModal(true)} className="flex items-center space-x-2 px-4 py-2 border-2 border-yellow-600 text-yellow-600 rounded font-medium hover:bg-yellow-50">
            <Mail className="w-4 h-4" />
            <span>Import from Email</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700">
            <Plus className="w-4 h-4" />
            <span>Add Intro</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Intros</div>
          <div className="text-3xl font-bold mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Attendance Rate</div>
          <div className="text-3xl font-bold mt-1">{attendanceRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Conversion Rate</div>
          <div className="text-3xl font-bold mt-1">{conversionRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">Needs Follow-up</div>
          <div className="text-3xl font-bold mt-1">{metrics.needsFollowUp}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff</label>
            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Staff</option>
              {staffMembers.map(staff => <option key={staff} value={staff}>{staff}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Classes</option>
              {classTypes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="all">All Status</option>
              <option value="needs-followup">Needs Follow-up</option>
              <option value="attended">Attended</option>
              <option value="not-attended">Not Attended</option>
              <option value="signed-up">Signed Up</option>
            </select>
          </div>
        </div>
      </div>
      {/* Pagination Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Items per page */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>

          {/* Page info */}
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredIntros.length)} of {filteredIntros.length}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Last
            </button>
          </div>
        </div>

        {/* Selected items indicator */}
        {selectedIds.size > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {selectedIds.size} item(s) selected
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">All Intros ({filteredIntros.length})</h3>
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
                    {paginatedIntros.length > 0 && paginatedIntros.every(intro => selectedIds.has(intro.id)) ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attended</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signed Up</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedIntros.map((intro) => (
                <tr key={intro.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelection(intro.id)}>
                      {selectedIds.has(intro.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{intro.month} {intro.date}</td>
                  <td className="px-6 py-4 text-sm">{intro.time || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {intro.name}
                    {(intro.follow_up_notes?.length ?? 0) > 0 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{intro.follow_up_notes!.length} notes</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {intro.email && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <Mail className="w-3 h-3" />
                        <span>{intro.email}</span>
                      </div>
                    )}
                    {intro.phone && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{intro.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{intro.class}</td>
                  <td className="px-6 py-4 text-sm">{intro.staff}</td>
                  <td className="px-6 py-4 text-sm">
                    <select value={intro.attended || ''} onChange={(e) => handleStatusUpdate(intro.id, 'attended', e.target.value)} className="text-sm rounded border-gray-300 px-2 py-1">
                      <option value="">-</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select value={intro.signed_up || ''} onChange={(e) => handleStatusUpdate(intro.id, 'signed_up', e.target.value)} className="text-sm rounded border-gray-300 px-2 py-1">
                      <option value="">-</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      {intro.attended === 'Yes' && intro.signed_up !== 'Yes' && (
                        <button onClick={() => { setFollowUpIntro(intro); setShowFollowUpModal(true); }} className="text-yellow-600 hover:text-yellow-800" title="Follow-up">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditingIntro({ ...intro }); setShowEditModal(true); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(intro.id, intro.name)} className="text-red-600 hover:text-red-800" title="Delete">
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '32rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 className="text-xl font-bold mb-4">Add New Intro</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Month *</label>
                  <select value={newIntro.month} onChange={(e) => setNewIntro({ ...newIntro, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">Select month</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input type="number" value={newIntro.date} onChange={(e) => setNewIntro({ ...newIntro, date: e.target.value })} className="w-full px-3 py-2 border rounded" min="1" max="31" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input type="text" value={newIntro.time} onChange={(e) => setNewIntro({ ...newIntro, time: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="6:00 PM" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={newIntro.name} onChange={(e) => setNewIntro({ ...newIntro, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={newIntro.email} onChange={(e) => setNewIntro({ ...newIntro, email: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="text" value={newIntro.phone} onChange={(e) => setNewIntro({ ...newIntro, phone: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class</label>
                <select value={newIntro.class} onChange={(e) => setNewIntro({ ...newIntro, class: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select class</option>
                  {classTypes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Staff</label>
                <select value={newIntro.staff} onChange={(e) => setNewIntro({ ...newIntro, staff: e.target.value })} className="w-full px-3 py-2 border rounded">
                  <option value="">Select staff</option>
                  {staffMembers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewIntro({ month: '', date: '', time: '', class: '', name: '', email: '', phone: '', staff: '', attended: '', signed_up: '' }); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddIntro} disabled={!newIntro.name || !newIntro.month || !newIntro.date} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Add Intro</button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '42rem', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 className="text-xl font-bold mb-4">Import from Email</h3>
            <p className="text-sm text-gray-600 mb-3">
              Paste the email content below and click Import to parse the data.
            </p>
            <textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Paste email text here..."
              className="w-full p-3 border rounded font-mono text-sm resize-none"
              style={{
                minHeight: '200px',
                maxHeight: '400px',
                height: Math.min(400, Math.max(200, emailInput.split('\n').length * 20 + 40)) + 'px'
              }}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => { setShowEmailModal(false); setEmailInput(''); }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailImport}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={!emailInput.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '64rem',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 className="text-xl font-bold mb-4">Confirm CSV Import</h3>
            <p className="text-sm text-gray-600 mb-4">Review {importPreviewData.length} records:</p>
            <div className="border rounded overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Month</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Class</th>
                    <th className="px-4 py-2 text-left">Staff</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importPreviewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{row.month}</td>
                      <td className="px-4 py-2">{row.date}</td>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{row.class}</td>
                      <td className="px-4 py-2">{row.staff}</td>
                      <td className="px-4 py-2">
                        {checkDuplicate(row.name, row.date, row.month, row.class) ? (
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

      {showEditModal && editingIntro && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '32rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 className="text-xl font-bold mb-4">Edit Intro</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Month</label>
                  <select value={editingIntro.month} onChange={(e) => setEditingIntro({ ...editingIntro, month: e.target.value })} className="w-full px-3 py-2 border rounded">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="number" value={editingIntro.date} onChange={(e) => setEditingIntro({ ...editingIntro, date: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded" min="1" max="31" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input type="text" value={editingIntro.time || ''} onChange={(e) => setEditingIntro({ ...editingIntro, time: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={editingIntro.name} onChange={(e) => setEditingIntro({ ...editingIntro, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={editingIntro.email || ''} onChange={(e) => setEditingIntro({ ...editingIntro, email: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="text" value={editingIntro.phone || ''} onChange={(e) => setEditingIntro({ ...editingIntro, phone: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select value={editingIntro.class} onChange={(e) => setEditingIntro({ ...editingIntro, class: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">Select</option>
                    {[...new Set([...classTypes, editingIntro.class])].filter(Boolean).map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Staff</label>
                  <select value={editingIntro.staff} onChange={(e) => setEditingIntro({ ...editingIntro, staff: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">Select</option>
                    {[...new Set([...staffMembers, editingIntro.staff])].filter(Boolean).map(staff => <option key={staff} value={staff}>{staff}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Attended</label>
                  <select value={editingIntro.attended || ''} onChange={(e) => setEditingIntro({ ...editingIntro, attended: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">-</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Signed Up</label>
                  <select value={editingIntro.signed_up || ''} onChange={(e) => setEditingIntro({ ...editingIntro, signed_up: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">-</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingIntro(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSave} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showFollowUpModal && followUpIntro && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '32rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 className="text-xl font-bold mb-4">Add Follow-up Note</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Following up with: <strong>{followUpIntro.name}</strong></p>
              {followUpIntro.email && (
                <p className="text-xs text-gray-500 flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  {followUpIntro.email}
                </p>
              )}
              {followUpIntro.phone && (
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Phone className="w-3 h-3 mr-1" />
                  {followUpIntro.phone}
                </p>
              )}
            </div>
            {(followUpIntro.follow_up_notes?.length ?? 0) > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-xs font-medium text-gray-700 mb-2">Previous follow-ups:</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {followUpIntro.follow_up_notes!.map((note: any, idx: number) => (
                    <div key={note.id || idx} className="text-xs text-gray-600">
                      <p className="font-medium">{new Date(note.created_at).toLocaleDateString()}</p>
                      <p>{note.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <textarea value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="Enter follow-up notes..." className="w-full h-32 p-3 border rounded" />
            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => { setShowFollowUpModal(false); setFollowUpIntro(null); setFollowUpNote(''); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleFollowUpSave} disabled={!followUpNote.trim()} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Save Note</button>
            </div>
          </div>
        </div>
      )}

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
              <h3 className="text-xl font-bold">Manage Classes & Staff</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
              <button
                onClick={() => setSettingsTab('classes')}
                className={`px-4 py-2 font-medium ${settingsTab === 'classes'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600'
                  }`}
              >
                Class Types
              </button>
              <button
                onClick={() => setSettingsTab('staff')}
                className={`px-4 py-2 font-medium ${settingsTab === 'staff'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600'
                  }`}
              >
                Staff Members
              </button>
            </div>

            {/* Class Types Tab */}
            {settingsTab === 'classes' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Class Type
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addClassType()}
                      placeholder="Enter class name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={addClassType}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 mb-3">Current Class Types ({classTypes.length})</h4>
                  {classTypes.map((classType, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingClassIndex === index ? (
                        <input
                          type="text"
                          defaultValue={classType}
                          onBlur={(e) => updateClassType(index, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateClassType(index, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">{classType}</span>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingClassIndex(index)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteClassType(index)}
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

            {/* Staff Members Tab */}
            {settingsTab === 'staff' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Staff Member
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addStaffMember()}
                      placeholder="Enter staff name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={addStaffMember}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 mb-3">Current Staff Members ({staffMembers.length})</h4>
                  {staffMembers.map((staff, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingStaffIndex === index ? (
                        <input
                          type="text"
                          defaultValue={staff}
                          onBlur={(e) => updateStaffMember(index, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateStaffMember(index, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">{staff}</span>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStaffIndex(index)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteStaffMember(index)}
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
    </div>
  );
}