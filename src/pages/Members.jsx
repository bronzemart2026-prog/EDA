import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { toBanglaNumber, formatBDT, formatBanglaDate, formatBanglaMonth } from '../utils/bangla';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import ReceiptModal from '../components/ReceiptModal';
import Pagination from '../components/Pagination';
import { Plus, Search, Info, PlusCircle, History, Edit, X, Save, Calendar, Download, FileText, Receipt, Trash2, AlertTriangle, Upload, Camera, Eye, Image as ImageIcon } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { membersService } from '../utils/supabaseService';
import { optimizeImageToTargetSize } from '../utils/imageOptimizer';

export default function Members() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  // Lists & Filtering
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Modals state
  const [activeMemberDetail, setActiveMemberDetail] = useState(null); // Detailed member object
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null); // For receipt modal

  // Image Upload and Preview state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [nidFrontFile, setNidFrontFile] = useState(null);
  const [nidFrontPreview, setNidFrontPreview] = useState('');
  const [nidBackFile, setNidBackFile] = useState(null);
  const [nidBackPreview, setNidBackPreview] = useState('');
  const [previewImage, setPreviewImage] = useState(null); // { url, title }

  // Compress & optimize image file to ~100KB on selection
  const handleImageFileChange = async (file, setFile, setPreview) => {
    if (!file) return;
    try {
      const optimized = await optimizeImageToTargetSize(file, 100);
      setFile(optimized);
      setPreview(URL.createObjectURL(optimized));
    } catch (e) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'member'|'deposit', target, label }
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Selected Member for operations
  const [selectedMember, setSelectedMember] = useState(null);

  // Form submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [memberForm, setMemberForm] = useState({
    name: '',
    mobile: '',
    address: '',
    nid: '',
    joiningDate: '',
    monthlyDepositAmount: '',
    status: 'active',
    photoUrl: '',
    nidFrontUrl: '',
    nidBackUrl: ''
  });

  const [depositForm, setDepositForm] = useState({
    amount: '',
    month: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [depositsList, setDepositsList] = useState([]);

  // Fetch Members List
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/members');
      setMembers(data);
    } catch (err) {
      setError(err.message || 'সদস্য তালিকা লোড করা সম্ভব হয়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Filtered members list
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(search.toLowerCase()) ||
    member.memberId.toLowerCase().includes(search.toLowerCase()) ||
    member.mobile.includes(search)
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  const handleExportExcel = () => {
    const cols = [
      { header: 'সদস্য আইডি', key: 'memberId' },
      { header: 'নাম', key: 'name' },
      { header: 'মোবাইল', key: 'mobile' },
      { header: 'ঠিকানা', key: 'address' },
      { header: 'জাতীয় পরিচয়পত্র', key: 'nid' },
      { header: 'যোগদানের তারিখ', key: 'joiningDateFormatted' },
      { header: 'মাসিক সঞ্চয়', key: 'monthlyDepositFormatted' },
      { header: 'মোট সঞ্চয় জমা', key: 'totalDepositedFormatted' },
      { header: 'মোট সঞ্চয় বকেয়া', key: 'totalDueFormatted' },
      { header: 'অবস্থা', key: 'statusFormatted' }
    ];
    const dataToExport = filteredMembers.map(m => ({
      ...m,
      joiningDateFormatted: formatBanglaDate(m.joiningDate),
      monthlyDepositFormatted: formatBDT(m.monthlyDepositAmount),
      totalDepositedFormatted: formatBDT(m.totalDeposited),
      totalDueFormatted: formatBDT(m.totalDue),
      statusFormatted: m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'
    }));
    exportToExcel(dataToExport, cols, 'Member_List', 'সদস্য তালিকা');
  };

  const handleExportPDF = () => {
    const cols = [
      { header: 'আইডি', key: 'memberId' },
      { header: 'নাম', key: 'name' },
      { header: 'মোবাইল', key: 'mobile' },
      { header: 'মোট সঞ্চয়', key: 'totalDepositedFormatted' },
      { header: 'বকেয়া সঞ্চয়', key: 'totalDueFormatted' },
      { header: 'অবস্থা', key: 'statusFormatted' }
    ];
    const dataToExport = filteredMembers.map(m => ({
      ...m,
      totalDepositedFormatted: formatBDT(m.totalDeposited),
      totalDueFormatted: formatBDT(m.totalDue),
      statusFormatted: m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'
    }));
    exportToPDF(dataToExport, cols, 'সদস্য তালিকা', 'Member_List');
  };

  // Handle Add Member Submit
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let photoUrl = memberForm.photoUrl || '';
      let nidFrontUrl = memberForm.nidFrontUrl || '';
      let nidBackUrl = memberForm.nidBackUrl || '';

      if (photoFile) {
        toast.loading('সদস্যের ছবি আপলোড হচ্ছে...');
        photoUrl = await membersService.uploadDocument(photoFile, 'photo');
      }
      if (nidFrontFile) {
        toast.loading('জাতীয় পরিচয়পত্রের সামনের ছবি আপলোড হচ্ছে...');
        nidFrontUrl = await membersService.uploadDocument(nidFrontFile, 'nid-front');
      }
      if (nidBackFile) {
        toast.loading('জাতীয় পরিচয়পত্রের পেছনের ছবি আপলোড হচ্ছে...');
        nidBackUrl = await membersService.uploadDocument(nidBackFile, 'nid-back');
      }

      toast.dismiss();

      const promise = apiRequest('/api/members', {
        method: 'POST',
        body: {
          ...memberForm,
          photoUrl,
          nidFrontUrl,
          nidBackUrl
        }
      });

      toast.promise(promise, {
        loading: 'যোগ করা হচ্ছে...',
        success: 'সদস্য সফলভাবে যোগ করা হয়েছে!',
        error: (err) => err.message || 'সদস্য যোগ করতে ব্যর্থ হয়েছে'
      });

      await promise;
      setShowAddModal(false);
      resetMemberForm();
      fetchMembers();
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || 'সদস্য যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Member Submit
  const handleEditMember = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let photoUrl = memberForm.photoUrl || '';
      let nidFrontUrl = memberForm.nidFrontUrl || '';
      let nidBackUrl = memberForm.nidBackUrl || '';

      if (photoFile) {
        toast.loading('সদস্যের নতুন ছবি আপলোড হচ্ছে...');
        photoUrl = await membersService.uploadDocument(photoFile, 'photo');
      }
      if (nidFrontFile) {
        toast.loading('জাতীয় পরিচয়পত্রের সামনের নতুন ছবি আপলোড হচ্ছে...');
        nidFrontUrl = await membersService.uploadDocument(nidFrontFile, 'nid-front');
      }
      if (nidBackFile) {
        toast.loading('জাতীয় পরিচয়পত্রের পেছনের নতুন ছবি আপলোড হচ্ছে...');
        nidBackUrl = await membersService.uploadDocument(nidBackFile, 'nid-back');
      }

      toast.dismiss();

      const promise = apiRequest(`/api/members/${selectedMember._id}`, {
        method: 'PUT',
        body: {
          ...memberForm,
          photoUrl,
          nidFrontUrl,
          nidBackUrl
        }
      });

      toast.promise(promise, {
        loading: 'আপডেট করা হচ্ছে...',
        success: 'তথ্য সফলভাবে আপডেট করা হয়েছে!',
        error: (err) => err.message || 'তথ্য পরিবর্তন করতে ব্যর্থ হয়েছে'
      });

      await promise;
      setShowEditModal(false);
      resetMemberForm();
      fetchMembers();
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || 'তথ্য পরিবর্তন করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Deposit Entry Submit
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const promise = apiRequest(`/api/members/${selectedMember._id}/deposit`, {
      method: 'POST',
      body: depositForm
    });

    toast.promise(promise, {
      loading: 'জমা রেকর্ড করা হচ্ছে...',
      success: 'সঞ্চয় সফলভাবে জমা হয়েছে!',
      error: (err) => err.message || 'জমা রেকর্ড করতে ব্যর্থ হয়েছে'
    });

    try {
      const res = await promise;
      setShowDepositModal(false);
      fetchMembers();
      // If detail modal is open, refresh detail data
      if (activeMemberDetail && activeMemberDetail.member._id === selectedMember._id) {
        handleViewDetails(selectedMember._id);
      }
      // Show receipt automatically
      setReceiptData({
        id: res?._id || res?.deposit?._id || '',
        type: 'deposit',
        memberName: selectedMember.name,
        memberId: selectedMember.memberId,
        mobile: selectedMember.mobile,
        address: selectedMember.address,
        month: formatBanglaMonth(depositForm.month),
        date: formatBanglaDate(depositForm.date),
        amount: formatBDT(depositForm.amount),
        amountRaw: depositForm.amount,
        recordedBy: user.name,
      });
    } catch (err) { } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch and show details
  const handleViewDetails = async (id) => {
    try {
      const details = await apiRequest(`/api/members/${id}`);
      setActiveMemberDetail(details);
    } catch (err) {
      toast.error('সদস্য তথ্য বিস্তারিত লোড করা যাচ্ছে না');
    }
  };

  // Fetch and show deposit history
  const handleViewHistory = async (member) => {
    setSelectedMember(member);
    try {
      const data = await apiRequest(`/api/members/${member._id}/history`);
      setDepositsList(data);
      setShowHistoryModal(true);
    } catch (err) {
      toast.error('জমা ইতিহাস লোড করা যাচ্ছে না');
    }
  };

  // Trigger deposit collection modal setup
  const handleOpenDepositModal = (member) => {
    setSelectedMember(member);

    // Set default amount to member's monthly rate
    // Set default month to current month YYYY-MM
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    setDepositForm({
      amount: member.monthlyDepositAmount,
      month: currentMonthStr,
      date: today.toISOString().split('T')[0]
    });
    setShowDepositModal(true);
  };

  // Trigger edit modal setup
  const handleOpenEditModal = (member) => {
    setSelectedMember(member);
    setMemberForm({
      name: member.name,
      mobile: member.mobile,
      address: member.address,
      nid: member.nid,
      joiningDate: new Date(member.joiningDate).toISOString().split('T')[0],
      monthlyDepositAmount: member.monthlyDepositAmount,
      status: member.status,
      photoUrl: member.photoUrl || '',
      nidFrontUrl: member.nidFrontUrl || '',
      nidBackUrl: member.nidBackUrl || ''
    });
    setPhotoPreview(member.photoUrl || '');
    setNidFrontPreview(member.nidFrontUrl || '');
    setNidBackPreview(member.nidBackUrl || '');
    setPhotoFile(null);
    setNidFrontFile(null);
    setNidBackFile(null);
    setShowEditModal(true);
  };

  const resetMemberForm = () => {
    setMemberForm({
      name: '',
      mobile: '',
      address: '',
      nid: '',
      joiningDate: '',
      monthlyDepositAmount: '',
      status: 'active',
      photoUrl: '',
      nidFrontUrl: '',
      nidBackUrl: ''
    });
    setPhotoPreview('');
    setNidFrontPreview('');
    setNidBackPreview('');
    setPhotoFile(null);
    setNidFrontFile(null);
    setNidBackFile(null);
    setSelectedMember(null);
  };

  // Generate Month list for select input starting from member's joining date up to current month
  const getMonthDropdownOptions = (joiningDate) => {
    const list = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Start from joining date if provided, else fall back to 12 months ago
    const start = joiningDate ? new Date(joiningDate) : new Date(today.getFullYear(), today.getMonth() - 12, 1);
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();

    for (let y = startYear; y <= currentYear; y++) {
      const mStart = (y === startYear) ? startMonth : 0;
      const mEnd   = (y === currentYear) ? currentMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const val = `${y}-${String(m + 1).padStart(2, '0')}`;
        list.push(val);
      }
    }
    return list;
  };

  // --- Delete handlers ---
  const openDeleteModal = (type, target, label) => {
    setDeleteModal({ type, target, label });
    setDeleteConfirmInput('');
  };

  const closeDeleteModal = () => {
    setDeleteModal(null);
    setDeleteConfirmInput('');
  };

  const handleDeleteMember = async () => {
    if (!deleteModal || deleteModal.type !== 'member') return;
    try {
      const promise = apiRequest(`/api/members/${deleteModal.target._id}`, { method: 'DELETE' });
      toast.promise(promise, {
        loading: 'মুছে ফেলা হচ্ছে...',
        success: 'সদস্য সফলভাবে মুছে ফেলা হয়েছে!',
        error: (err) => err.message || 'সদস্য মুছতে ব্যর্থ হয়েছে'
      });
      await promise;
      closeDeleteModal();
      setActiveMemberDetail(null);
      fetchMembers();
    } catch (err) {}
  };

  const handleDeleteDeposit = async () => {
    if (!deleteModal || deleteModal.type !== 'deposit') return;
    try {
      const promise = apiRequest(`/api/members/deposit/${deleteModal.target._id}`, { method: 'DELETE' });
      toast.promise(promise, {
        loading: 'মুছে ফেলা হচ্ছে...',
        success: 'জমার রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!',
        error: (err) => err.message || 'রেকর্ড মুছতে ব্যর্থ হয়েছে'
      });
      await promise;
      closeDeleteModal();
      // Refresh history list
      if (selectedMember) {
        const data = await apiRequest(`/api/members/${selectedMember._id}/history`);
        setDepositsList(data);
      }
      fetchMembers();
    } catch (err) {}
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'member') handleDeleteMember();
    else if (deleteModal.type === 'deposit') handleDeleteDeposit();
  };

  return (
    <div className="app-container">
      <Header title="সদস্যবৃন্দ" />

      <main className="content-wrapper">

        {/* Header Action & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.05rem' }}>সদস্য তালিকা ({toBanglaNumber(filteredMembers.length)} জন)</h3>
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: 'auto', minHeight: '38px', gap: '4px', flexShrink: 0 }}
              onClick={() => {
                resetMemberForm();
                setMemberForm(prev => ({
                  ...prev,
                  joiningDate: new Date().toISOString().split('T')[0]
                }));
                setShowAddModal(true);
              }}
            >
              <Plus size={16} />
              <span>সদস্য যোগ করুন</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="নাম, মোবাইল বা আইডি দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button
            onClick={handleExportExcel}
            className="btn"
            style={{
              flex: 1,
              background: 'white',
              border: '1px solid #cbd5e1',
              color: 'var(--primary-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.85rem',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              minHeight: '40px'
            }}
          >
            <Download size={14} color="#16a34a" />
            <span>Excel এক্সপোর্ট</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="btn"
            style={{
              flex: 1,
              background: 'white',
              border: '1px solid #cbd5e1',
              color: 'var(--primary-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.85rem',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              minHeight: '40px'
            }}
          >
            <FileText size={14} color="#dc2626" />
            <span>PDF এক্সপোর্ট</span>
          </button>
        </div>

        {error && (
          <div className="card" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Member list rendering */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
            <svg style={{
              animation: 'spin 1s linear infinite',
              width: '36px',
              height: '36px',
              color: 'var(--primary)'
            }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            কোনো সদস্য পাওয়া যায়নি
          </div>
        ) : (
          paginatedMembers.map(member => (
            <div 
              className="action-card" 
              key={member._id}
              style={{
                border: member.totalDue > 0 ? '1.5px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                backgroundColor: member.totalDue > 0 ? '#fff5f5' : '#ffffff',
                boxShadow: member.totalDue > 0 ? '0 4px 12px rgba(239, 68, 68, 0.05)' : 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--primary-light, #e0e7ff)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      border: '1.5px solid rgba(0,0,0,0.08)',
                      cursor: member.photoUrl ? 'pointer' : 'default'
                    }}
                    onClick={(e) => {
                      if (member.photoUrl) {
                        e.stopPropagation();
                        setPreviewImage({ url: member.photoUrl, title: member.name });
                      }
                    }}
                  >
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      member.name?.charAt(0) || 'স'
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.5 }}>
                      আইডি: <strong>{toBanglaNumber(member.memberId)}</strong> · {toBanglaNumber(member.mobile)}
                    </p>
                  </div>
                </div>
                {member.totalDue > 0 && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--danger)', 
                    fontWeight: 'bold', 
                    alignSelf: 'center', 
                    backgroundColor: '#fee2e2', 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    whiteSpace: 'nowrap'
                  }}>
                    মোট বকেয়া: {formatBDT(member.totalDue)}
                  </span>
                )}
                <span className={`list-badge ${member.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ flexShrink: 0 }}>
                  {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.8rem', minWidth: 0 }}>
                  সঞ্চয়: <strong style={{ color: 'var(--success)' }}>{formatBDT(member.totalDeposited)}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', minWidth: 0 }}>
                  বকেয়া: <strong style={member.totalDue > 0 ? { color: 'var(--danger)' } : { color: 'var(--success)' }}>{formatBDT(member.totalDue)} {member.totalDue > 0 && member.monthlyDepositAmount > 0 && `(${toBanglaNumber(Math.round(member.totalDue / member.monthlyDepositAmount))} মাস)`}</strong>
                </div>
              </div>

              {/* Table Action Column Rules mapped as buttons */}
              <div className="list-actions">
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                  onClick={() => handleViewDetails(member._id)}
                >
                  <Info size={14} />
                  <span>বিস্তারিত</span>
                </button>

                {isAdmin && (
                  <button
                    className="btn btn-accent btn-sm"
                    style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                    onClick={() => handleOpenDepositModal(member)}
                  >
                    <PlusCircle size={14} />
                    <span>জমা</span>
                  </button>
                )}

                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                  onClick={() => handleViewHistory(member)}
                >
                  <History size={14} />
                  <span>ইতিহাস</span>
                </button>

                {isAdmin && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                    onClick={() => handleOpenEditModal(member)}
                  >
                    <Edit size={14} />
                    <span>এডিট</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    className="btn btn-sm"
                    style={{ flex: 1, minHeight: '36px', gap: '2px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                    onClick={() => openDeleteModal('member', member, member.name)}
                  >
                    <Trash2 size={14} />
                    <span>মুছুন</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Members Pagination */}
        {!loading && filteredMembers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredMembers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}

        {/* ----------------- MODAL: MEMBER DETAILS ----------------- */}
        {activeMemberDetail && (
          <div className="modal-overlay" onClick={() => setActiveMemberDetail(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>সদস্য বিস্তারিত বিবরণী</h3>
                <button className="modal-close" onClick={() => setActiveMemberDetail(null)}>
                  <X size={24} />
                </button>
              </div>

              {/* Personal Info Card */}
              <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <div 
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--primary-light, #e0e7ff)',
                      border: '2px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: activeMemberDetail.member.photoUrl ? 'pointer' : 'default'
                    }}
                    onClick={() => activeMemberDetail.member.photoUrl && setPreviewImage({ url: activeMemberDetail.member.photoUrl, title: `${activeMemberDetail.member.name} - ছবি` })}
                  >
                    {activeMemberDetail.member.photoUrl ? (
                      <img src={activeMemberDetail.member.photoUrl} alt={activeMemberDetail.member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {activeMemberDetail.member.name?.charAt(0) || 'স'}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-dark)' }}>{activeMemberDetail.member.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      সদস্য আইডি: <strong>{toBanglaNumber(activeMemberDetail.member.memberId)}</strong>
                    </span>
                  </div>
                </div>

                <table style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>মোবাইল নম্বর:</td>
                      <td style={{ padding: '4px 0' }}>{toBanglaNumber(activeMemberDetail.member.mobile)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>জাতীয় পরিচয়পত্র:</td>
                      <td style={{ padding: '4px 0' }}>{toBanglaNumber(activeMemberDetail.member.nid)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>যোগদানের তারিখ:</td>
                      <td style={{ padding: '4px 0' }}>{formatBanglaDate(activeMemberDetail.member.joiningDate)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>বর্তমান ঠিকানা:</td>
                      <td style={{ padding: '4px 0' }}>{activeMemberDetail.member.address}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>সদস্যপদ স্থিতি:</td>
                      <td style={{ padding: '4px 0' }}>
                        <span className={`list-badge ${activeMemberDetail.member.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {activeMemberDetail.member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* NID Card Documents Preview */}
              {(activeMemberDetail.member.nidFrontUrl || activeMemberDetail.member.nidBackUrl) && (
                <div className="card" style={{ padding: '12px', marginTop: '10px' }}>
                  <h5 style={{ fontSize: '0.88rem', marginBottom: '8px', color: 'var(--primary-dark)' }}>জাতীয় পরিচয়পত্র (NID) ডকুমেন্টস</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {activeMemberDetail.member.nidFrontUrl && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>সামনের অংশ</span>
                        <div 
                          style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', background: '#f8fafc' }}
                          onClick={() => setPreviewImage({ url: activeMemberDetail.member.nidFrontUrl, title: `${activeMemberDetail.member.name} - NID সামনের অংশ` })}
                        >
                          <img src={activeMemberDetail.member.nidFrontUrl} alt="NID Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    )}
                    {activeMemberDetail.member.nidBackUrl && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>পেছনের অংশ</span>
                        <div 
                          style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', background: '#f8fafc' }}
                          onClick={() => setPreviewImage({ url: activeMemberDetail.member.nidBackUrl, title: `${activeMemberDetail.member.name} - NID পেছনের অংশ` })}
                        >
                          <img src={activeMemberDetail.member.nidBackUrl} alt="NID Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Balance Summary */}
              <div className="grid-2">
                <div className="kpi-card success" style={{ padding: '10px' }}>
                  <span className="kpi-title">মোট সঞ্চয় জমা</span>
                  <span className="kpi-value" style={{ fontSize: '1.15rem' }}>{formatBDT(activeMemberDetail.calculations.totalDeposited)}</span>
                </div>
                <div className="kpi-card danger" style={{ padding: '10px' }}>
                  <span className="kpi-title">মোট বকেয়া পরিমাণ</span>
                  <span className="kpi-value" style={{ fontSize: '1.15rem' }}>{formatBDT(activeMemberDetail.calculations.totalDue)}</span>
                </div>
              </div>

              <div className="card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>মাসিক সঞ্চয়ের কিস্তি হার</span>
                  <h4 style={{ fontSize: '1.1rem' }}>{formatBDT(activeMemberDetail.member.monthlyDepositAmount)}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>মোট হিসাবকৃত মাস</span>
                  <h4 style={{ fontSize: '1.1rem' }}>{toBanglaNumber(activeMemberDetail.calculations.monthsElapsed)} মাস</h4>
                </div>
              </div>

              {/* Month-by-month Schedule Checklist */}
              <h4 style={{ fontSize: '1rem', marginBottom: '8px', paddingLeft: '4px' }}>মাসভিত্তিক জমার বিবরণী</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '8px' }}>মাস</th>
                      <th style={{ padding: '8px' }}>আদায়</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>স্থিতি</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMemberDetail.schedule.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px' }}>{formatBanglaMonth(item.month)}</td>
                        <td style={{ padding: '8px' }}>{formatBDT(item.paidAmount)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <span className={`list-badge ${item.status === 'PAID' ? 'badge-success' : (item.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger')
                            }`}>
                            {item.status === 'PAID' ? 'পরিশোধিত' : (item.status === 'PARTIAL' ? 'আংশিক' : 'বকেয়া')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-accent"
                    style={{ flex: 1 }}
                    onClick={() => {
                      handleOpenDepositModal(activeMemberDetail.member);
                    }}
                  >
                    <PlusCircle size={18} style={{ marginRight: '6px' }} />
                    <span>নতুন জমা এন্ট্রি করুন</span>
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                    onClick={() => openDeleteModal('member', activeMemberDetail.member, activeMemberDetail.member.name)}
                  >
                    <Trash2 size={18} style={{ marginRight: '6px' }} />
                    <span>সদস্য মুছে ফেলুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- MODAL: CREATE MEMBER ----------------- */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>নতুন সদস্য নিবন্ধন</h3>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMember}>
                <div className="form-group">
                  <label className="form-label">সদস্যের নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="যেমন: মোঃ আরিফ হোসেন"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    placeholder="যেমন: 01700000000"
                    value={memberForm.mobile}
                    onChange={(e) => setMemberForm({ ...memberForm, mobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">জাতীয় পরিচয়পত্র (NID) নম্বর</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    placeholder="জাতীয় পরিচয়পত্র নম্বর দিন"
                    value={memberForm.nid}
                    onChange={(e) => setMemberForm({ ...memberForm, nid: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ঠিকানা</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="গ্রাম, ডাকঘর, থানা, জেলা"
                    value={memberForm.address}
                    onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                  />
                </div>

                {/* Member Photo Upload */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>সদস্যের ছবি (ঐচ্ছিক)</span>
                    {photoPreview && (
                      <button 
                        type="button" 
                        onClick={() => { setPhotoFile(null); setPhotoPreview(''); setMemberForm(prev => ({ ...prev, photoUrl: '' })); }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        মুছে ফেলুন
                      </button>
                    )}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px dashed var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        flexShrink: 0,
                        cursor: photoPreview ? 'pointer' : 'default'
                      }}
                      onClick={() => photoPreview && setPreviewImage({ url: photoPreview, title: 'সদস্যের ছবি' })}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={22} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="add-member-photo"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileChange(e.target.files?.[0], setPhotoFile, setPhotoPreview)}
                      />
                      <label
                        htmlFor="add-member-photo"
                        className="btn btn-outline btn-sm"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={14} />
                        <span>{photoPreview ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}</span>
                      </label>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG (স্বয়ংক্রিয়ভাবে ১০০KB অপ্টিমাইজড হবে)</p>
                    </div>
                  </div>
                </div>

                {/* NID Front & Back Upload */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>NID সামনের অংশ (ঐচ্ছিক)</label>
                    <div 
                      style={{
                        height: '80px',
                        borderRadius: '8px',
                        border: '2px dashed var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        position: 'relative'
                      }}
                    >
                      {nidFrontPreview ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img src={nidFrontPreview} alt="NID Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: nidFrontPreview, title: 'জাতীয় পরিচয়পত্র (সামনের অংশ)' })}
                            style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="add-nid-front" style={{ cursor: 'pointer', textAlign: 'center', padding: '6px' }}>
                          <Upload size={18} style={{ color: 'var(--text-muted)', margin: '0 auto 4px' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'block' }}>আপলোড</span>
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="add-nid-front"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileChange(e.target.files?.[0], setNidFrontFile, setNidFrontPreview)}
                      />
                    </div>
                    {nidFrontPreview && (
                      <label htmlFor="add-nid-front" style={{ fontSize: '0.72rem', color: 'var(--primary)', cursor: 'pointer', display: 'block', marginTop: '2px', textAlign: 'center' }}>
                        পরিবর্তন করুন
                      </label>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>NID পেছনের অংশ (ঐচ্ছিক)</label>
                    <div 
                      style={{
                        height: '80px',
                        borderRadius: '8px',
                        border: '2px dashed var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        position: 'relative'
                      }}
                    >
                      {nidBackPreview ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img src={nidBackPreview} alt="NID Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: nidBackPreview, title: 'জাতীয় পরিচয়পত্র (পেছনের অংশ)' })}
                            style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="add-nid-back" style={{ cursor: 'pointer', textAlign: 'center', padding: '6px' }}>
                          <Upload size={18} style={{ color: 'var(--text-muted)', margin: '0 auto 4px' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'block' }}>আপলোড</span>
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="add-nid-back"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileChange(e.target.files?.[0], setNidBackFile, setNidBackPreview)}
                      />
                    </div>
                    {nidBackPreview && (
                      <label htmlFor="add-nid-back" style={{ fontSize: '0.72rem', color: 'var(--primary)', cursor: 'pointer', display: 'block', marginTop: '2px', textAlign: 'center' }}>
                        পরিবর্তন করুন
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">যোগদানের তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={memberForm.joiningDate}
                    onChange={(e) => setMemberForm({ ...memberForm, joiningDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মাসিক সঞ্চয়ের কিস্তি পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    placeholder="যেমন: 500"
                    value={memberForm.monthlyDepositAmount}
                    onChange={(e) => setMemberForm({ ...memberForm, monthlyDepositAmount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">সদস্যপদের স্থিতি</label>
                  <select
                    className="form-control"
                    value={memberForm.status}
                    onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value })}
                  >
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'নিবন্ধন সম্পন্ন করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: EDIT MEMBER ----------------- */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>সদস্য তথ্য পরিবর্তন</h3>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditMember}>
                <div className="form-group">
                  <label className="form-label">সদস্যের নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    value={memberForm.mobile}
                    onChange={(e) => setMemberForm({ ...memberForm, mobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">জাতীয় পরিচয়পত্র (NID) নম্বর</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={memberForm.nid}
                    onChange={(e) => setMemberForm({ ...memberForm, nid: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ঠিকানা</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={memberForm.address}
                    onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                  />
                </div>

                {/* Member Photo Upload */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>সদস্যের ছবি</span>
                    {photoPreview && (
                      <button 
                        type="button" 
                        onClick={() => { setPhotoFile(null); setPhotoPreview(''); setMemberForm(prev => ({ ...prev, photoUrl: '' })); }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        মুছে ফেলুন
                      </button>
                    )}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px dashed var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        flexShrink: 0,
                        cursor: photoPreview ? 'pointer' : 'default'
                      }}
                      onClick={() => photoPreview && setPreviewImage({ url: photoPreview, title: 'সদস্যের ছবি' })}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={22} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-member-photo"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileChange(e.target.files?.[0], setPhotoFile, setPhotoPreview)}
                      />
                      <label
                        htmlFor="edit-member-photo"
                        className="btn btn-outline btn-sm"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={14} />
                        <span>{photoPreview ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}</span>
                      </label>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG (স্বয়ংক্রিয়ভাবে ১০০KB অপ্টিমাইজড হবে)</p>
                    </div>
                  </div>
                </div>

                {/* NID Front & Back Upload */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>NID সামনের অংশ</label>
                    <div 
                      style={{
                        height: '80px',
                        borderRadius: '8px',
                        border: '2px dashed var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        position: 'relative'
                      }}
                    >
                      {nidFrontPreview ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img src={nidFrontPreview} alt="NID Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: nidFrontPreview, title: 'জাতীয় পরিচয়পত্র (সামনের অংশ)' })}
                            style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="edit-nid-front" style={{ cursor: 'pointer', textAlign: 'center', padding: '6px' }}>
                          <Upload size={18} style={{ color: 'var(--text-muted)', margin: '0 auto 4px' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'block' }}>আপলোড</span>
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-nid-front"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileChange(e.target.files?.[0], setNidFrontFile, setNidFrontPreview)}
                      />
                    </div>
                    {nidFrontPreview && (
                      <label htmlFor="edit-nid-front" style={{ fontSize: '0.72rem', color: 'var(--primary)', cursor: 'pointer', display: 'block', marginTop: '2px', textAlign: 'center' }}>
                        পরিবর্তন করুন
                      </label>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>NID পেছনের অংশ</label>
                    <div 
                      style={{
                        height: '80px',
                        borderRadius: '8px',
                        border: '2px dashed var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        position: 'relative'
                      }}
                    >
                      {nidBackPreview ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img src={nidBackPreview} alt="NID Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: nidBackPreview, title: 'জাতীয় পরিচয়পত্র (পেছনের অংশ)' })}
                            style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="edit-nid-back" style={{ cursor: 'pointer', textAlign: 'center', padding: '6px' }}>
                          <Upload size={18} style={{ color: 'var(--text-muted)', margin: '0 auto 4px' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'block' }}>আপলোড</span>
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-nid-back"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileChange(e.target.files?.[0], setNidBackFile, setNidBackPreview)}
                      />
                    </div>
                    {nidBackPreview && (
                      <label htmlFor="edit-nid-back" style={{ fontSize: '0.72rem', color: 'var(--primary)', cursor: 'pointer', display: 'block', marginTop: '2px', textAlign: 'center' }}>
                        পরিবর্তন করুন
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">যোগদানের তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={memberForm.joiningDate}
                    onChange={(e) => setMemberForm({ ...memberForm, joiningDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মাসিক সঞ্চয়ের পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    value={memberForm.monthlyDepositAmount}
                    onChange={(e) => setMemberForm({ ...memberForm, monthlyDepositAmount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">সদস্যপদের স্থিতি</label>
                  <select
                    className="form-control"
                    value={memberForm.status}
                    onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value })}
                  >
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'আপডেট সংরক্ষণ করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: DEPOSIT ENTRY ----------------- */}
        {showDepositModal && selectedMember && (
          <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>মাসিক সঞ্চয় জমা এন্ট্রি</h3>
                <button className="modal-close" onClick={() => setShowDepositModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                সদস্য: <strong>{selectedMember.name}</strong> (আইডি: {toBanglaNumber(selectedMember.memberId)})
              </div>

              <form onSubmit={handleDepositSubmit}>
                <div className="form-group">
                  <label className="form-label">কোন মাসের সঞ্চয়?</label>
                  <select
                    required
                    className="form-control"
                    value={depositForm.month}
                    onChange={(e) => setDepositForm({ ...depositForm, month: e.target.value })}
                  >
                    <option value="">মাস নির্বাচন করুন...</option>
                    {getMonthDropdownOptions(selectedMember.joiningDate).map((mOption) => (
                      <option key={mOption} value={mOption}>
                        {formatBanglaMonth(mOption)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">জমার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">জমার তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={depositForm.date}
                    onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-accent" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <PlusCircle size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'জমা নিশ্চিত করুন ও রশিদ পান'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: DEPOSIT HISTORY ----------------- */}
        {showHistoryModal && selectedMember && (
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>সঞ্চয় জমা ইতিহাস</h3>
                <button className="modal-close" onClick={() => setShowHistoryModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                সদস্য: <strong>{selectedMember.name}</strong> (আইডি: {toBanglaNumber(selectedMember.memberId)})
              </div>

              {depositsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  কোনো জমার রেকর্ড পাওয়া যায়নি
                </div>
              ) : (
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '8px' }}>মাস</th>
                        <th style={{ padding: '8px' }}>তারিখ</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>পরিমাণ</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>রশিদ</th>
                        {isAdmin && <th style={{ padding: '8px', textAlign: 'center' }}>মুছুন</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {depositsList.map((dep) => (
                        <tr key={dep._id}>
                          <td style={{ padding: '8px' }}>{formatBanglaMonth(dep.month)}</td>
                          <td style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatBanglaDate(dep.date)}
                            {dep.recordedBy && <div style={{ fontSize: '0.65rem' }}>সংগ্রাহক: {dep.recordedBy.name}</div>}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: 'var(--success)' }}>
                            {formatBDT(dep.amount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              onClick={() => setReceiptData({
                                id: dep._id,
                                type: 'deposit',
                                memberName: selectedMember.name,
                                memberId: selectedMember.memberId,
                                mobile: selectedMember.mobile,
                                address: selectedMember.address,
                                month: formatBanglaMonth(dep.month),
                                date: formatBanglaDate(dep.date),
                                amount: formatBDT(dep.amount),
                                amountRaw: dep.amount,
                                recordedBy: dep.recordedBy?.name || '',
                              })}
                              style={{
                                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                                color: 'white', border: 'none', borderRadius: '7px',
                                padding: '5px 8px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '3px', fontSize: '0.72rem',
                                fontWeight: 700, fontFamily: 'inherit',
                                boxShadow: '0 2px 6px rgba(29, 78, 216, 0.3)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Receipt size={12} /> রশিদ
                            </button>
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                onClick={() => openDeleteModal('deposit', dep, formatBanglaMonth(dep.month))}
                                style={{
                                  background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                                  borderRadius: '7px', padding: '5px 8px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem',
                                  fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
                                }}
                              >
                                <Trash2 size={12} /> মুছুন
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        <Footer />
      </main>

      <BottomNav />

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          receipt={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* ----------------- MODAL: DELETE CONFIRMATION ----------------- */}
      {deleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} />
                {deleteModal.type === 'member' ? 'সদস্য মুছে ফেলার নিশ্চিতকরণ' : 'রেকর্ড মুছে ফেলার নিশ্চিতকরণ'}
              </h3>
              <button className="modal-close" onClick={closeDeleteModal}><X size={24} /></button>
            </div>

            <div style={{ padding: '4px 0 16px' }}>
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.88rem', color: '#991b1b' }}>
                ⚠️ সতর্কতা: এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
                {deleteModal.type === 'member' && (
                  <div style={{ marginTop: '6px' }}>সদস্যের সমস্ত জমার রেকর্ড এবং ব্যবহারকারী অ্যাকাউন্টও মুছে যাবে।</div>
                )}
              </div>

              <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                নিশ্চিত করতে নিচের বাক্সে <strong>&ldquo;{deleteModal.label}&rdquo;</strong> টাইপ করুন:
              </p>
              <input
                type="text"
                className="form-control"
                placeholder={deleteModal.label}
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                style={{ marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn"
                  style={{ flex: 1, background: '#f1f5f9', color: '#334155' }}
                  onClick={closeDeleteModal}
                >বাতিল</button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    background: deleteConfirmInput === deleteModal.label ? '#dc2626' : '#f87171',
                    color: 'white',
                    cursor: deleteConfirmInput === deleteModal.label ? 'pointer' : 'not-allowed',
                    opacity: deleteConfirmInput === deleteModal.label ? 1 : 0.6
                  }}
                  disabled={deleteConfirmInput !== deleteModal.label}
                  onClick={handleDeleteConfirm}
                >
                  <Trash2 size={16} style={{ marginRight: '4px' }} />
                  স্থায়ীভাবে মুছুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: IMAGE PREVIEW LIGHTBOX ----------------- */}
      {previewImage && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} 
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '540px', padding: '16px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary-dark)', fontWeight: 600 }}>{previewImage.title}</h4>
              <button 
                className="modal-close" 
                onClick={() => setPreviewImage(null)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }} 
              />
            </div>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                <span>ফুল স্ক্রিন / ডাউনলোড</span>
              </a>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => setPreviewImage(null)}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
