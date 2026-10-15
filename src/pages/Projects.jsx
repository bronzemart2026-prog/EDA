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
import { Plus, Search, Info, HandCoins, History, Edit, X, Save, ShieldAlert, Award, Download, FileText, Receipt, Trash2, AlertTriangle } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { recalcInvestmentFields, getProjectDurationDisplay } from '../utils/investmentCalculations';

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  // Lists & Filtering
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Modals state
  const [activeProjectDetail, setActiveProjectDetail] = useState(null); // Detailed project calculations & schedule
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null); // For receipt modal

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'project'|'installment', target, label }
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Selected Project for operations
  // Selected Project for operations
  const [selectedProject, setSelectedProject] = useState(null);

  // Form submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    projectType: 'অটো রিকশা',
    driverName: '',
    driverMobile: '',
    driverAddress: '',
    driverNid: '',
    nomineeName: '',
    nomineeMobile: '',
    investmentAmount: '',
    interestPercentage: '',
    returnAmount: '',
    startDate: '',
    installmentDuration: '',
    monthlyInstallmentAmount: '',
    status: 'active',
    lastEdited: 'percentage'
  });

  const [installmentForm, setInstallmentForm] = useState({
    amount: '',
    month: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [installmentsList, setInstallmentsList] = useState([]);

  // Fetch Projects List
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/projects');
      setProjects(data);
    } catch (err) {
      setError(err.message || 'প্রজেক্ট তালিকা লোড করা সম্ভব হয়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects list
  const filteredProjects = projects.filter(project =>
    project.projectName.toLowerCase().includes(search.toLowerCase()) ||
    project.driverName.toLowerCase().includes(search.toLowerCase()) ||
    project.driverMobile.includes(search)
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const handleExportExcel = () => {
    const cols = [
      { header: 'প্রজেক্ট নাম', key: 'projectName' },
      { header: 'প্রজেক্ট ধরন', key: 'projectType' },
      { header: 'চালক নাম', key: 'driverName' },
      { header: 'চালক মোবাইল', key: 'driverMobile' },
      { header: 'চালক ঠিকানা', key: 'driverAddress' },
      { header: 'চালক NID', key: 'driverNid' },
      { header: 'বিনিয়োগ পরিমাণ', key: 'investmentFormatted' },
      { header: 'ফেরত লক্ষ্য', key: 'returnFormatted' },
      { header: 'মোট আদায়কৃত', key: 'totalPaidFormatted' },
      { header: 'বকেয়া পরিমাণ', key: 'totalDueFormatted' },
      { header: 'শুরুর তারিখ', key: 'startDateFormatted' },
      { header: 'মেয়াদ (মাস)', key: 'durationFormatted' },
      { header: 'অবস্থা', key: 'statusFormatted' }
    ];
    const dataToExport = filteredProjects.map(p => ({
      ...p,
      investmentFormatted: formatBDT(p.investmentAmount),
      returnFormatted: formatBDT(p.returnAmount),
      totalPaidFormatted: formatBDT(p.totalPaid),
      totalDueFormatted: formatBDT(p.totalDue),
      startDateFormatted: formatBanglaDate(p.startDate),
      durationFormatted: toBanglaNumber(p.installmentDuration),
      statusFormatted: p.status === 'completed' ? 'সম্পন্ন' : (p.status === 'due' ? 'বকেয়া' : 'চলতি')
    }));
    exportToExcel(dataToExport, cols, 'Project_List', 'প্রজেক্ট তালিকা');
  };

  const handleExportPDF = () => {
    const cols = [
      { header: 'প্রজেক্ট নাম', key: 'projectName' },
      { header: 'চালক', key: 'driverName' },
      { header: 'বিনিয়োগ', key: 'investmentFormatted' },
      { header: 'আদায়কৃত', key: 'totalPaidFormatted' },
      { header: 'বকেয়া', key: 'totalDueFormatted' },
      { header: 'অবস্থা', key: 'statusFormatted' }
    ];
    const dataToExport = filteredProjects.map(p => ({
      ...p,
      investmentFormatted: formatBDT(p.investmentAmount),
      returnFormatted: formatBDT(p.returnAmount),
      totalPaidFormatted: formatBDT(p.totalPaid),
      totalDueFormatted: formatBDT(p.totalDue),
      statusFormatted: p.status === 'completed' ? 'সম্পন্ন' : (p.status === 'due' ? 'বকেয়া' : 'চলতি')
    }));
    exportToPDF(dataToExport, cols, 'প্রজেক্ট তালিকা', 'Project_List');
  };

  const handleInvestmentChange = (val) => {
    setProjectForm(prev => recalcInvestmentFields({ ...prev, investmentAmount: val }, 'investment'));
  };

  const handlePercentageChange = (val) => {
    setProjectForm(prev => recalcInvestmentFields({ ...prev, interestPercentage: val }, 'percentage'));
  };

  const handleReturnAmountChange = (val) => {
    setProjectForm(prev => recalcInvestmentFields({ ...prev, returnAmount: val }, 'returnAmount'));
  };

  const handleDurationChange = (val) => {
    setProjectForm(prev => recalcInvestmentFields({ ...prev, installmentDuration: val }, 'duration'));
  };

  // Handle Add Project Submit
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const promise = apiRequest('/api/projects', {
      method: 'POST',
      body: projectForm
    });

    toast.promise(promise, {
      loading: 'তৈরি করা হচ্ছে...',
      success: 'প্রজেক্ট সফলভাবে তৈরি হয়েছে!',
      error: (err) => err.message || 'প্রজেক্ট তৈরি করতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      setShowAddModal(false);
      resetProjectForm();
      fetchProjects();
    } catch (err) {} finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Project Submit
  const handleEditProject = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const promise = apiRequest(`/api/projects/${selectedProject._id}`, {
      method: 'PUT',
      body: projectForm
    });

    toast.promise(promise, {
      loading: 'আপডেট করা হচ্ছে...',
      success: 'প্রজেক্ট সফলভাবে আপডেট হয়েছে!',
      error: (err) => err.message || 'প্রজেক্ট আপডেট করতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      setShowEditModal(false);
      resetProjectForm();
      fetchProjects();
    } catch (err) {} finally {
      setIsSubmitting(false);
    }
  };

  // Handle Installment Collection Submit
  const handleInstallmentSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const promise = apiRequest(`/api/projects/${selectedProject._id}/installment`, {
      method: 'POST',
      body: installmentForm
    });

    toast.promise(promise, {
      loading: 'রেকর্ড করা হচ্ছে...',
      success: 'কিস্তি সফলভাবে এন্ট্রি হয়েছে!',
      error: (err) => err.message || 'কিস্তি সংগ্রহ এন্ট্রি করতে ব্যর্থ হয়েছে'
    });

    try {
      const res = await promise;
      setShowCollectModal(false);
      fetchProjects();
      // If detail modal is open, refresh detail data
      if (activeProjectDetail && activeProjectDetail.project._id === selectedProject._id) {
        handleViewDetails(selectedProject._id);
      }
      // Show receipt automatically
      setReceiptData({
        id: res?._id || res?.installment?._id || '',
        type: 'installment',
        projectName: selectedProject.projectName,
        projectType: selectedProject.projectType,
        driverName: selectedProject.driverName,
        driverMobile: selectedProject.driverMobile,
        month: formatBanglaMonth(installmentForm.month),
        date: formatBanglaDate(installmentForm.date),
        amount: formatBDT(installmentForm.amount),
        amountRaw: installmentForm.amount,
        recordedBy: user.name,
      });
    } catch (err) {} finally {
      setIsSubmitting(false);
    }
  };

  // Fetch and show details
  const handleViewDetails = async (id) => {
    try {
      const details = await apiRequest(`/api/projects/${id}`);
      setActiveProjectDetail(details);
    } catch (err) {
      toast.error('প্রজেক্ট বিস্তারিত বিবরণী লোড করা যাচ্ছে না');
    }
  };

  // Fetch and show installment collection history
  const handleViewHistory = async (project) => {
    setSelectedProject(project);
    try {
      const data = await apiRequest(`/api/projects/${project._id}/history`);
      setInstallmentsList(data);
      setShowHistoryModal(true);
    } catch (err) {
      toast.error('কিস্তি সংগ্রহের তালিকা লোড করা যাচ্ছে না');
    }
  };

  // Trigger collect installment modal setup
  const handleOpenCollectModal = (project) => {
    setSelectedProject(project);
    
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    setInstallmentForm({
      amount: project.monthlyInstallmentAmount,
      month: currentMonthStr,
      date: today.toISOString().split('T')[0]
    });
    setShowCollectModal(true);
  };

  // Trigger edit modal setup
  const handleOpenEditModal = (project) => {
    setSelectedProject(project);
    setProjectForm({
      projectName: project.projectName,
      projectType: project.projectType,
      driverName: project.driverName,
      driverMobile: project.driverMobile,
      driverAddress: project.driverAddress,
      driverNid: project.driverNid,
      nomineeName: project.nomineeName,
      nomineeMobile: project.nomineeMobile,
      investmentAmount: project.investmentAmount,
      interestPercentage: project.interestPercentage ?? '',
      returnAmount: project.returnAmount,
      startDate: new Date(project.startDate).toISOString().split('T')[0],
      installmentDuration: project.installmentDuration,
      monthlyInstallmentAmount: project.monthlyInstallmentAmount,
      status: project.status,
      lastEdited: 'percentage'
    });
    setShowEditModal(true);
  };

  const resetProjectForm = () => {
    setProjectForm({
      projectName: '',
      projectType: 'অটো রিকশা',
      driverName: '',
      driverMobile: '',
      driverAddress: '',
      driverNid: '',
      nomineeName: '',
      nomineeMobile: '',
      investmentAmount: '',
      interestPercentage: '',
      returnAmount: '',
      startDate: '',
      installmentDuration: '',
      monthlyInstallmentAmount: '',
      status: 'active',
      lastEdited: 'percentage'
    });
    setSelectedProject(null);
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

  const handleDeleteProject = async () => {
    if (!deleteModal || deleteModal.type !== 'project') return;
    try {
      const promise = apiRequest(`/api/projects/${deleteModal.target._id}`, { method: 'DELETE' });
      toast.promise(promise, {
        loading: 'মুছে ফেলা হচ্ছে...',
        success: 'প্রজেক্ট সফলভাবে মুছে ফেলা হয়েছে!',
        error: (err) => err.message || 'প্রজেক্ট মুছতে ব্যর্থ হয়েছে'
      });
      await promise;
      closeDeleteModal();
      setActiveProjectDetail(null);
      fetchProjects();
    } catch (err) {}
  };

  const handleDeleteInstallment = async () => {
    if (!deleteModal || deleteModal.type !== 'installment') return;
    try {
      const promise = apiRequest(`/api/projects/installment/${deleteModal.target._id}`, { method: 'DELETE' });
      toast.promise(promise, {
        loading: 'মুছে ফেলা হচ্ছে...',
        success: 'কিস্তির রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!',
        error: (err) => err.message || 'রেকর্ড মুছতে ব্যর্থ হয়েছে'
      });
      await promise;
      closeDeleteModal();
      if (selectedProject) {
        const data = await apiRequest(`/api/projects/${selectedProject._id}/history`);
        setInstallmentsList(data);
      }
      fetchProjects();
    } catch (err) {}
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'project') handleDeleteProject();
    else if (deleteModal.type === 'installment') handleDeleteInstallment();
  };
  // Generate Month list for select input based on project start and duration
  const getProjectMonthOptions = (proj) => {
    if (!proj) return [];
    const list = [];
    const start = new Date(proj.startDate);
    for (let i = 0; i < proj.installmentDuration; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push(val);
    }
    return list;
  };

  return (
    <div className="app-container">
      <Header title="প্রজেক্ট/বিনিয়োগ" />

      <main className="content-wrapper">

        {/* Header Action & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.05rem' }}>বিনিয়োগ তালিকা ({toBanglaNumber(filteredProjects.length)} টি)</h3>
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: 'auto', minHeight: '38px', gap: '4px', flexShrink: 0 }}
              onClick={() => {
                resetProjectForm();
                setProjectForm(prev => ({
                  ...prev,
                  startDate: new Date().toISOString().split('T')[0]
                }));
                setShowAddModal(true);
              }}
            >
              <Plus size={16} />
              <span>প্রজেক্ট তৈরি করুন</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="প্রজেক্ট নাম বা চালকের নাম দিয়ে খুঁজুন..."
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

        {/* Projects list rendering */}
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
        ) : filteredProjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            কোনো প্রজেক্ট পাওয়া যায়নি
          </div>
        ) : (
          paginatedProjects.map(project => {
            // Calculate collection percentage based on current payable amount
            const progressBase = project.totalPayable > 0 ? project.totalPayable : project.returnAmount;
            const pct = progressBase > 0
              ? Math.min(100, Math.round((project.totalPaid / progressBase) * 100))
              : 0;
            const duration = getProjectDurationDisplay(project);

            return (
              <div 
                className="action-card" 
                key={project._id}
                style={{
                  border: project.totalDue > 0 ? '1.5px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                  backgroundColor: project.totalDue > 0 ? '#fff5f5' : '#ffffff',
                  boxShadow: project.totalDue > 0 ? '0 4px 12px rgba(239, 68, 68, 0.05)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.projectName}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      চালক: <strong style={{ fontWeight: '800', color: '#1e293b' }}>{project.driverName}</strong> · <strong style={{ fontWeight: '800', color: '#1e293b' }}>{toBanglaNumber(project.driverMobile)}</strong>
                    </p>
                  </div>
                  {project.remainingBalance > 0 && (
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
                      মোট বকেয়া: {formatBDT(project.remainingBalance)}
                    </span>
                  )}
                  <span className={`list-badge ${
                    project.status === 'completed' 
                      ? 'badge-success' 
                      : (project.status === 'due' ? 'badge-danger' : 'badge-warning')
                  }`} style={{ flexShrink: 0 }}>
                    {project.status === 'completed' ? 'সম্পন্ন' : (project.status === 'due' ? 'বকেয়া' : 'চলতি')}
                  </span>
                </div>

                {/* Investment Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px', backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem' }}>
                  <div style={{ minWidth: 0 }}>বিনিয়োগ: <strong>{formatBDT(project.investmentAmount)}</strong></div>
                  <div style={{ minWidth: 0 }}>
                    ফেরত লক্ষ্য: <strong>{formatBDT(project.returnAmount)}</strong>
                    {project.returnAmount - project.investmentAmount > 0 && (
                      <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.72rem', marginLeft: '4px' }}>
                        (লাভ: {formatBDT(project.returnAmount - project.investmentAmount)})
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>মাসিক কিস্তি: <strong style={{ color: 'var(--primary)' }}>{formatBDT(project.monthlyInstallmentAmount)}</strong></div>
                  <div style={{ minWidth: 0 }}>কিস্তির মেয়াদ: <strong>{toBanglaNumber(project.installmentDuration)} মাস</strong></div>
                  <div style={{ minWidth: 0 }}>
                    {duration.label}: <strong>{toBanglaNumber(duration.months)} {duration.suffix}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    আদায়কৃত: <strong style={{ color: 'var(--success)' }}>{formatBDT(project.totalPaid)}</strong>
                    {project.totalPaid - project.investmentAmount > 0 && (
                      <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.72rem', marginLeft: '4px' }}>
                        (লাভ: {formatBDT(project.totalPaid - project.investmentAmount)})
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>বকেয়া: <strong style={project.totalDue > 0 ? { color: 'var(--danger)' } : { color: 'var(--success)' }}>{formatBDT(project.totalDue)} {project.totalDue > 0 && project.monthlyInstallmentAmount > 0 && `(${toBanglaNumber(Math.round(project.totalDue / project.monthlyInstallmentAmount))} মাস)`}</strong></div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    <span>পরিশোধের অগ্রগতি:</span>
                    <span>{toBanglaNumber(pct)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--success)', borderRadius: '4px' }}></div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="list-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                    onClick={() => handleViewDetails(project._id)}
                  >
                    <Info size={14} />
                    <span>বিস্তারিত</span>
                  </button>

                  {isAdmin && (
                    <button
                      className="btn btn-accent btn-sm"
                      style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                      onClick={() => handleOpenCollectModal(project)}
                    >
                      <HandCoins size={14} />
                      <span>আদায়</span>
                    </button>
                  )}

                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                    onClick={() => handleViewHistory(project)}
                  >
                    <History size={14} />
                    <span>ইতিহাস</span>
                  </button>

                  {isAdmin && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, minHeight: '36px', gap: '2px' }}
                      onClick={() => handleOpenEditModal(project)}
                    >
                      <Edit size={14} />
                      <span>এডিট</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, minHeight: '36px', gap: '2px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                      onClick={() => openDeleteModal('project', project, project.projectName)}
                    >
                      <Trash2 size={14} />
                      <span>মুছুন</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Projects Pagination */}
        {!loading && filteredProjects.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProjects.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}

        {/* ----------------- MODAL: PROJECT DETAILS ----------------- */}
        {activeProjectDetail && (
          <div className="modal-overlay" onClick={() => setActiveProjectDetail(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>বিনিয়োগ বিস্তারিত বিবরণী</h3>
                <button className="modal-close" onClick={() => setActiveProjectDetail(null)}>
                  <X size={24} />
                </button>
              </div>

              {/* General Project Info */}
              <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '12px', marginBottom: '12px' }}>
                <h4 style={{ marginBottom: '8px' }}>{activeProjectDetail.project.projectName}</h4>
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>প্রজেক্ট ধরন:</td>
                      <td style={{ padding: '4px 0' }}>{activeProjectDetail.project.projectType}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>শুরুর তারিখ:</td>
                      <td style={{ padding: '4px 0' }}>{formatBanglaDate(activeProjectDetail.project.startDate)}</td>
                    </tr>
                    {(() => {
                      const duration = getProjectDurationDisplay(activeProjectDetail.project, activeProjectDetail.calculations);
                      return (
                        <tr>
                          <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>{duration.label} সময়:</td>
                          <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{toBanglaNumber(duration.months)} {duration.suffix}</td>
                        </tr>
                      );
                    })()}
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>কিস্তির মেয়াদ:</td>
                      <td style={{ padding: '4px 0' }}>{toBanglaNumber(activeProjectDetail.project.installmentDuration)} মাস</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>মাসিক কিস্তির পরিমাণ:</td>
                      <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{formatBDT(activeProjectDetail.project.monthlyInstallmentAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>প্রজেক্ট স্থিতি:</td>
                      <td style={{ padding: '4px 0' }}>
                        <span className={`list-badge ${
                          activeProjectDetail.project.status === 'completed' 
                            ? 'badge-success' 
                            : (activeProjectDetail.project.status === 'due' ? 'badge-danger' : 'badge-warning')
                        }`}>
                          {activeProjectDetail.project.status === 'completed' ? 'সম্পন্ন' : (activeProjectDetail.project.status === 'due' ? 'বকেয়া' : 'চলতি')}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Driver & Nominee Details */}
              <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--primary)' }}>চালক ও নমিনির বিবরণী</h4>
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>চালকের নাম:</td>
                      <td style={{ fontWeight: 'bold' }}>{activeProjectDetail.project.driverName}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>চালক মোবাইল:</td>
                      <td style={{ fontWeight: 'bold' }}>{toBanglaNumber(activeProjectDetail.project.driverMobile)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>চালক NID:</td>
                      <td>{toBanglaNumber(activeProjectDetail.project.driverNid)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>চালকের ঠিকানা:</td>
                      <td>{activeProjectDetail.project.driverAddress}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ color: 'var(--text-muted)', padding: '6px 0 4px' }}>নমিনির নাম:</td>
                      <td style={{ padding: '6px 0 4px' }}>{activeProjectDetail.project.nomineeName}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>নমিনি মোবাইল:</td>
                      <td>{toBanglaNumber(activeProjectDetail.project.nomineeMobile)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div className="kpi-card" style={{ padding: '8px', borderLeftColor: 'var(--primary)' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>বিনিয়োগকৃত মূলধন</span>
                  <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeProjectDetail.project.investmentAmount)}</span>
                </div>
                <div className="kpi-card success" style={{ padding: '8px' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>মোট ফেরত লক্ষ্য</span>
                  <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeProjectDetail.project.returnAmount)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div className="kpi-card success" style={{ padding: '8px', borderLeftColor: 'var(--success)' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>মোট আদায়কৃত কিস্তি</span>
                  <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeProjectDetail.calculations.totalPaid)}</span>
                </div>
                <div className="kpi-card danger" style={{ padding: '8px' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>চলতি মোট বকেয়া</span>
                  <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeProjectDetail.calculations.totalDue)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div className="kpi-card" style={{ padding: '8px', borderLeftColor: '#0ea5e9' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>বর্তমান মোট প্রদেয়</span>
                  <span className="kpi-value" style={{ fontSize: '1rem', color: '#0ea5e9' }}>{formatBDT(activeProjectDetail.calculations.totalPayable)}</span>
                </div>
                <div className="kpi-card" style={{ padding: '8px', borderLeftColor: '#8b5cf6' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>অবশিষ্ট পাওনা</span>
                  <span className="kpi-value" style={{ fontSize: '1rem', color: '#8b5cf6' }}>{formatBDT(activeProjectDetail.calculations.remainingBalance)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div className="kpi-card" style={{ padding: '8px', borderLeftColor: '#f59e0b' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>মাসিক মুনাফা</span>
                  <span className="kpi-value" style={{ fontSize: '1rem', color: '#f59e0b' }}>{formatBDT(activeProjectDetail.calculations.monthlyInterest)}</span>
                </div>
                <div className="kpi-card success" style={{ padding: '8px', borderLeftColor: activeProjectDetail.calculations.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  <span className="kpi-title" style={{ fontSize: '0.75rem' }}>{activeProjectDetail.calculations.profit >= 0 ? 'প্রজেক্ট মুনাফা (লাভ)' : 'প্রজেক্ট লোকসান (ক্ষতি)'}</span>
                  <span className="kpi-value" style={{ fontSize: '1rem', color: activeProjectDetail.calculations.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatBDT(Math.abs(activeProjectDetail.calculations.profit))}</span>
                </div>
              </div>

              {/* Project Schedule Checklist */}
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', paddingLeft: '4px' }}>মাসিক কিস্তি জমার বিবরণী</h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '8px' }}>মাস</th>
                      <th style={{ padding: '8px' }}>আদায়</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>স্থিতি</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProjectDetail.schedule.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px' }}>{formatBanglaMonth(item.month)}</td>
                        <td style={{ padding: '8px' }}>{formatBDT(item.paidAmount)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <span className={`list-badge ${
                            item.status === 'PAID' 
                              ? 'badge-success' 
                              : (item.status === 'PARTIAL' 
                                  ? 'badge-warning' 
                                  : (item.status === 'UPCOMING' ? 'badge-warning' : 'badge-danger'))
                          }`} style={item.status === 'UPCOMING' ? { backgroundColor: '#f1f5f9', color: '#64748b' } : {}}>
                            {item.status === 'PAID' ? 'পরিশোধিত' : (item.status === 'PARTIAL' ? 'আংশিক' : (item.status === 'UPCOMING' ? 'আসন্ন' : 'বকেয়া'))}
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
                      handleOpenCollectModal({
                        ...activeProjectDetail.project,
                        remainingBalance: activeProjectDetail.calculations.remainingBalance,
                        totalPayable: activeProjectDetail.calculations.totalPayable
                      });
                    }}
                  >
                    <HandCoins size={18} style={{ marginRight: '6px' }} />
                    <span>নতুন কিস্তি আদায় রেকর্ড করুন</span>
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                    onClick={() => openDeleteModal('project', activeProjectDetail.project, activeProjectDetail.project.projectName)}
                  >
                    <Trash2 size={18} style={{ marginRight: '6px' }} />
                    <span>প্রজেক্ট মুছে ফেলুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- MODAL: CREATE PROJECT ----------------- */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>নতুন বিনিয়োগ প্রজেক্ট তৈরি</h3>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddProject}>
                <h4 style={{ fontSize: '1rem', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>১. প্রজেক্টের তথ্য</h4>
                
                <div className="form-group">
                  <label className="form-label">প্রজেক্টের নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="যেমন: লাল রঙের অটোরিকশা ১০১"
                    value={projectForm.projectName}
                    onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">প্রজেক্টের ধরন</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="যেমন: অটো রিকশা, দোকান"
                    value={projectForm.projectType}
                    onChange={(e) => setProjectForm({ ...projectForm, projectType: e.target.value })}
                  />
                </div>

                <h4 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>২. চালকের তথ্য</h4>

                <div className="form-group">
                  <label className="form-label">চালকের নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="চালকের নাম লিখুন"
                    value={projectForm.driverName}
                    onChange={(e) => setProjectForm({ ...projectForm, driverName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    placeholder="মোবাইল নম্বর"
                    value={projectForm.driverMobile}
                    onChange={(e) => setProjectForm({ ...projectForm, driverMobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের NID নম্বর</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    placeholder="NID নম্বর"
                    value={projectForm.driverNid}
                    onChange={(e) => setProjectForm({ ...projectForm, driverNid: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের ঠিকানা</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="ঠিকানা"
                    value={projectForm.driverAddress}
                    onChange={(e) => setProjectForm({ ...projectForm, driverAddress: e.target.value })}
                  />
                </div>

                <h4 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>৩. নমিনির তথ্য</h4>

                <div className="form-group">
                  <label className="form-label">মনোনীত ব্যক্তির (নমিনি) নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="নমিনির নাম লিখুন"
                    value={projectForm.nomineeName}
                    onChange={(e) => setProjectForm({ ...projectForm, nomineeName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">নমিনির মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    placeholder="নমিনির মোবাইল"
                    value={projectForm.nomineeMobile}
                    onChange={(e) => setProjectForm({ ...projectForm, nomineeMobile: e.target.value })}
                  />
                </div>

                <h4 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>৪. বিনিয়োগ ও কিস্তির হিসাব</h4>

                <div className="form-group">
                  <label className="form-label">মূলধন বিনিয়োগের পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    className="form-control"
                    placeholder="যেমন: 100000"
                    value={projectForm.investmentAmount}
                    onChange={(e) => handleInvestmentChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মুনাফার হার (%)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    className="form-control"
                    placeholder="যেমন: 20"
                    value={projectForm.interestPercentage}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ফেরত পাওয়ার লক্ষ্যমাত্রা (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    className="form-control"
                    placeholder="যেমন: 130000"
                    value={projectForm.returnAmount}
                    onChange={(e) => handleReturnAmountChange(e.target.value)}
                  />
                  {/* Dynamic Profit/Loss Feedback */}
                  {(() => {
                    const inv = parseFloat(projectForm.investmentAmount);
                    const ret = parseFloat(projectForm.returnAmount);
                    if (!isNaN(inv) && !isNaN(ret)) {
                      const diff = ret - inv;
                      if (diff > 0) {
                        return (
                          <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                            ✓ লাভ: {formatBDT(diff)}
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span style={{ color: 'var(--danger)', fontWeight: '600', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                            ⚠️ ক্ষতি: {formatBDT(Math.abs(diff))}
                          </span>
                        );
                      } else {
                        return (
                          <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                            লাভ/ক্ষতি নেই
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label">কিস্তির মেয়াদ (মাস)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    placeholder="যেমন: 10"
                    value={projectForm.installmentDuration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">নির্ধারিত মাসিক কিস্তির পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    readOnly
                    className="form-control"
                    style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed' }}
                    value={projectForm.monthlyInstallmentAmount}
                  />
                  {(() => {
                    const ret = parseFloat(projectForm.returnAmount);
                    const dur = parseInt(projectForm.installmentDuration);
                    if (!isNaN(ret) && !isNaN(dur) && dur > 0) {
                      return (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                          হিসাব: {formatBDT(ret)} ÷ {toBanglaNumber(dur)} মাস = {formatBDT(ret / dur)}/মাস
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label">প্রজেক্ট শুরুর তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">প্রজেক্ট স্থিতি</label>
                  <select
                    className="form-control"
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                  >
                    <option value="active">সক্রিয় (চলতি)</option>
                    <option value="completed">সম্পন্ন</option>
                    <option value="due">বকেয়া</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'প্রজেক্ট চালু করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: EDIT PROJECT ----------------- */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>প্রজেক্টের তথ্য পরিবর্তন</h3>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditProject}>
                <div className="form-group">
                  <label className="form-label">প্রজেক্টের নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={projectForm.projectName}
                    onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">প্রজেক্টের ধরন</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={projectForm.projectType}
                    onChange={(e) => setProjectForm({ ...projectForm, projectType: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={projectForm.driverName}
                    onChange={(e) => setProjectForm({ ...projectForm, driverName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    value={projectForm.driverMobile}
                    onChange={(e) => setProjectForm({ ...projectForm, driverMobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের NID নম্বর</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={projectForm.driverNid}
                    onChange={(e) => setProjectForm({ ...projectForm, driverNid: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">চালকের ঠিকানা</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={projectForm.driverAddress}
                    onChange={(e) => setProjectForm({ ...projectForm, driverAddress: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মনোনীত ব্যক্তির (নমিনি) নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={projectForm.nomineeName}
                    onChange={(e) => setProjectForm({ ...projectForm, nomineeName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">নমিনির মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    value={projectForm.nomineeMobile}
                    onChange={(e) => setProjectForm({ ...projectForm, nomineeMobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মূলধন বিনিয়োগের পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    className="form-control"
                    value={projectForm.investmentAmount}
                    onChange={(e) => handleInvestmentChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মুনাফার হার (%)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    className="form-control"
                    placeholder="যেমন: 20"
                    value={projectForm.interestPercentage}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ফেরত পাওয়ার লক্ষ্যমাত্রা (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    className="form-control"
                    value={projectForm.returnAmount}
                    onChange={(e) => handleReturnAmountChange(e.target.value)}
                  />
                  {/* Dynamic Profit/Loss Feedback */}
                  {(() => {
                    const inv = parseFloat(projectForm.investmentAmount);
                    const ret = parseFloat(projectForm.returnAmount);
                    if (!isNaN(inv) && !isNaN(ret)) {
                      const diff = ret - inv;
                      if (diff > 0) {
                        return (
                          <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                            ✓ লাভ: {formatBDT(diff)}
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span style={{ color: 'var(--danger)', fontWeight: '600', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                            ⚠️ ক্ষতি: {formatBDT(Math.abs(diff))}
                          </span>
                        );
                      } else {
                        return (
                          <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                            লাভ/ক্ষতি নেই
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label">কিস্তির মেয়াদ (মাস)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    value={projectForm.installmentDuration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">নির্ধারিত মাসিক কিস্তির পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    readOnly
                    className="form-control"
                    style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed' }}
                    value={projectForm.monthlyInstallmentAmount}
                  />
                  {(() => {
                    const ret = parseFloat(projectForm.returnAmount);
                    const dur = parseInt(projectForm.installmentDuration);
                    if (!isNaN(ret) && !isNaN(dur) && dur > 0) {
                      return (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                          হিসাব: {formatBDT(ret)} ÷ {toBanglaNumber(dur)} মাস = {formatBDT(ret / dur)}/মাস
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label">প্রজেক্ট শুরুর তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">প্রজেক্ট স্থিতি</label>
                  <select
                    className="form-control"
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                  >
                    <option value="active">সক্রিয় (চলতি)</option>
                    <option value="completed">সম্পন্ন</option>
                    <option value="due">বকেয়া</option>
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

        {/* ----------------- MODAL: COLLECT INSTALLMENT ----------------- */}
        {showCollectModal && selectedProject && (
          <div className="modal-overlay" onClick={() => setShowCollectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>কিস্তি আদায় এন্ট্রি</h3>
                <button className="modal-close" onClick={() => setShowCollectModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                প্রজেক্ট: <strong>{selectedProject.projectName}</strong> (চালক: <strong>{selectedProject.driverName}</strong>)
                {selectedProject.remainingBalance > 0 && (
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    বর্তমান অবশিষ্ট পাওনা: <strong style={{ color: 'var(--primary)' }}>{formatBDT(selectedProject.remainingBalance)}</strong>
                    {selectedProject.totalPayable > 0 && (
                      <span> (মোট প্রদেয়: {formatBDT(selectedProject.totalPayable)})</span>
                    )}
                  </span>
                )}
              </div>

              <form onSubmit={handleInstallmentSubmit}>
                <div className="form-group">
                  <label className="form-label">কোন মাসের কিস্তি আদায়?</label>
                  <select
                    required
                    className="form-control"
                    value={installmentForm.month}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, month: e.target.value })}
                  >
                    <option value="">মাস নির্বাচন করুন...</option>
                    {getProjectMonthOptions(selectedProject).map((mOption) => (
                      <option key={mOption} value={mOption}>
                        {formatBanglaMonth(mOption)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">আদায়কৃত পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    value={installmentForm.amount}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">আদায়ের তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={installmentForm.date}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, date: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-accent" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <HandCoins size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'আদায় নিশ্চিত করুন ও রশিদ পান'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: INSTALLMENT HISTORY ----------------- */}
        {showHistoryModal && selectedProject && (
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>কিস্তি আদায়ের ইতিহাস</h3>
                <button className="modal-close" onClick={() => setShowHistoryModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                প্রজেক্ট: <strong>{selectedProject.projectName}</strong> (চালক: <strong>{selectedProject.driverName}</strong>)
              </div>

              {installmentsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  কোনো কিস্তি আদায়ের রেকর্ড পাওয়া যায়নি
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
                      {installmentsList.map((inst) => (
                        <tr key={inst._id}>
                          <td style={{ padding: '8px' }}>{formatBanglaMonth(inst.month)}</td>
                          <td style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatBanglaDate(inst.date)}
                            {inst.recordedBy && <div style={{ fontSize: '0.65rem' }}>সংগ্রাহক: {inst.recordedBy.name}</div>}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: 'var(--success)' }}>
                            {formatBDT(inst.amount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              onClick={() => setReceiptData({
                                id: inst._id,
                                type: 'installment',
                                projectName: selectedProject.projectName,
                                projectType: selectedProject.projectType,
                                driverName: selectedProject.driverName,
                                driverMobile: selectedProject.driverMobile,
                                month: formatBanglaMonth(inst.month),
                                date: formatBanglaDate(inst.date),
                                amount: formatBDT(inst.amount),
                                amountRaw: inst.amount,
                                recordedBy: inst.recordedBy?.name || '',
                              })}
                              style={{
                                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                                color: 'white', border: 'none', borderRadius: '7px',
                                padding: '5px 8px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '3px', fontSize: '0.72rem',
                                fontWeight: 700, fontFamily: 'inherit',
                                boxShadow: '0 2px 6px rgba(217,119,6,0.3)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Receipt size={12} /> রশিদ
                            </button>
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                onClick={() => openDeleteModal('installment', inst, formatBanglaMonth(inst.month))}
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
                {deleteModal.type === 'project' ? 'প্রজেক্ট মুছে ফেলার নিশ্চিতকরণ' : 'রেকর্ড মুছে ফেলার নিশ্চিতকরণ'}
              </h3>
              <button className="modal-close" onClick={closeDeleteModal}><X size={24} /></button>
            </div>

            <div style={{ padding: '4px 0 16px' }}>
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.88rem', color: '#991b1b' }}>
                ⚠️ সতর্কতা: এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
                {deleteModal.type === 'project' && (
                  <div style={{ marginTop: '6px' }}>প্রজেক্টের সমস্ত কিস্তির রেকর্ডও মুছে যাবে।</div>
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
    </div>
  );
}
