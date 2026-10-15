import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { toBanglaNumber, formatBDT, formatBanglaDate, formatBanglaMonth } from '../utils/bangla';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import Pagination from '../components/Pagination';
import { Plus, Search, Edit, X, Save, Calendar, Download, FileText, Trash2, Filter, Receipt } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  // Lists & Filtering
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date Filters
  const [filterType, setFilterType] = useState('alltime'); // 'date' | 'month' | 'year' | 'custom' | 'alltime'
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    description: ''
  });

  const categories = [
    { value: 'function', label: 'অনুষ্ঠান' },
    { value: 'document', label: 'কাগজপত্র ও দলিল' },
    { value: 'tea_snacks', label: 'চা-নাস্তা' },
    { value: 'office', label: 'অফিস খরচ' },
    { value: 'other', label: 'অন্যান্য' }
  ];

  const getCategoryLabel = (cat) => {
    const found = categories.find(c => c.value === cat);
    return found ? found.label : 'অন্যান্য';
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      
      let queryParams = `?category=${categoryFilter}`;
      if (filterType === 'date' && filterDate) {
        queryParams += `&date=${filterDate}`;
      } else if (filterType === 'month' && filterMonth) {
        queryParams += `&month=${filterMonth}`;
      } else if (filterType === 'year' && filterYear) {
        queryParams += `&year=${filterYear}`;
      } else if (filterType === 'custom' && filterStartDate && filterEndDate) {
        queryParams += `&startDate=${filterStartDate}&endDate=${filterEndDate}`;
      }

      const data = await apiRequest(`/api/expenses${queryParams}`);
      setExpenses(data);
    } catch (err) {
      setError(err.message || 'খরচের তালিকা লোড করা সম্ভব হয়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, filterType, filterDate, filterMonth, filterYear, filterStartDate, filterEndDate]);

  // Search filter locally
  const filteredExpenses = expenses.filter(exp =>
    exp.title.toLowerCase().includes(search.toLowerCase()) ||
    (exp.description && exp.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, filterType, filterDate, filterMonth, filterYear, filterStartDate, filterEndDate]);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  const totalExpenseSum = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleExportExcel = () => {
    const cols = [
      { header: 'শিরোনাম', key: 'title' },
      { header: 'ক্যাটাগরি', key: 'categoryLabel' },
      { header: 'পরিমাণ', key: 'amountFormatted' },
      { header: 'তারিখ', key: 'dateFormatted' },
      { header: 'বর্ণনা', key: 'description' },
      { header: 'রেকর্ডকারী', key: 'recordedBy' }
    ];
    const dataToExport = filteredExpenses.map(exp => ({
      title: exp.title,
      categoryLabel: getCategoryLabel(exp.category),
      amountFormatted: formatBDT(exp.amount),
      dateFormatted: formatBanglaDate(exp.date),
      description: exp.description || '',
      recordedBy: exp.recordedBy?.name || 'N/A'
    }));
    exportToExcel(dataToExport, cols, 'Expense_Report', 'খরচের তালিকা');
  };

  const handleExportPDF = () => {
    const cols = [
      { header: 'শিরোনাম', key: 'title' },
      { header: 'ক্যাটাগরি', key: 'categoryLabel' },
      { header: 'পরিমাণ', key: 'amountFormatted' },
      { header: 'তারিখ', key: 'dateFormatted' },
      { header: 'রেকর্ডকারী', key: 'recordedBy' }
    ];
    const dataToExport = filteredExpenses.map(exp => ({
      title: exp.title,
      categoryLabel: getCategoryLabel(exp.category),
      amountFormatted: formatBDT(exp.amount),
      dateFormatted: formatBanglaDate(exp.date),
      recordedBy: exp.recordedBy?.name || 'N/A'
    }));
    exportToPDF(dataToExport, cols, 'খরচ হিসাব রিপোর্ট', 'Expense_Report');
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const promise = apiRequest('/api/expenses', {
      method: 'POST',
      body: expenseForm
    });

    toast.promise(promise, {
      loading: 'খরচ যুক্ত করা হচ্ছে...',
      success: 'খরচ সফলভাবে যুক্ত করা হয়েছে!',
      error: (err) => err.message || 'খরচ যোগ করতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      setShowAddModal(false);
      resetForm();
      fetchExpenses();
    } catch (err) { } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpenseSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const promise = apiRequest(`/api/expenses/${selectedExpense._id}`, {
      method: 'PUT',
      body: expenseForm
    });

    toast.promise(promise, {
      loading: 'আপডেট করা হচ্ছে...',
      success: 'খরচের রেকর্ড আপডেট করা হয়েছে!',
      error: (err) => err.message || 'আপডেট করতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      setShowEditModal(false);
      resetForm();
      fetchExpenses();
    } catch (err) { } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই খরচের রেকর্ডটি মুছে ফেলতে চান?')) {
      return;
    }

    const promise = apiRequest(`/api/expenses/${id}`, {
      method: 'DELETE'
    });

    toast.promise(promise, {
      loading: 'মুছে ফেলা হচ্ছে...',
      success: 'খরচের রেকর্ডটি মুছে ফেলা হয়েছে',
      error: (err) => err.message || 'মুছে ফেলতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      fetchExpenses();
    } catch (err) { }
  };

  const handleOpenEditModal = (exp) => {
    setSelectedExpense(exp);
    setExpenseForm({
      title: exp.title,
      amount: exp.amount,
      date: new Date(exp.date).toISOString().split('T')[0],
      category: exp.category,
      description: exp.description || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setExpenseForm({
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      description: ''
    });
    setSelectedExpense(null);
  };

  return (
    <div className="app-container">
      <Header title="খরচ (Expenses)" />

      <main className="content-wrapper">
        {/* Title and Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.05rem' }}>খরচের তালিকা ({toBanglaNumber(filteredExpenses.length)} টি)</h3>
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: 'auto', minHeight: '38px', gap: '4px', flexShrink: 0 }}
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Plus size={16} />
              <span>নতুন খরচ যোগ করুন</span>
            </button>
          )}
        </div>

        {/* Filters and Date Range selection */}
        <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
          {/* Quick filter type selectors */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <button 
              className={`btn btn-sm ${filterType === 'date' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: '36px', minWidth: '80px', background: filterType === 'date' ? '' : 'white' }}
              onClick={() => setFilterType('date')}
            >
              তারিখ
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'month' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: '36px', minWidth: '80px', background: filterType === 'month' ? '' : 'white' }}
              onClick={() => setFilterType('month')}
            >
              মাস
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'year' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: '36px', minWidth: '80px', background: filterType === 'year' ? '' : 'white' }}
              onClick={() => setFilterType('year')}
            >
              বছর
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'custom' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: '36px', minWidth: '80px', background: filterType === 'custom' ? '' : 'white' }}
              onClick={() => setFilterType('custom')}
            >
              কাস্টম
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'alltime' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: '36px', minWidth: '80px', background: filterType === 'alltime' ? '' : 'white' }}
              onClick={() => setFilterType('alltime')}
            >
              সব সময়
            </button>
          </div>

          {/* Date Picker Form Group */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            {filterType === 'date' && (
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            )}
            {filterType === 'month' && (
              <input
                type="month"
                className="form-control"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            )}
            {filterType === 'year' && (
              <select
                className="form-control"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="2025">২০২৫ সাল</option>
                <option value="2026">২০২৬ সাল</option>
                <option value="2027">২০২৭ সাল</option>
                <option value="2028">২০২৮ সাল</option>
              </select>
            )}
            {filterType === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>শুরুর তারিখ</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filterStartDate}
                    max={filterEndDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>শেষ তারিখ</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filterEndDate}
                    min={filterStartDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category Dropdown and Search */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <select
                className="form-control"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ height: '40px' }}
              >
                <option value="all">সকল ক্যাটাগরি</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="search-wrapper" style={{ flex: 2, minWidth: '180px', marginBottom: 0 }}>
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="খরচের নাম বা বিবরণ দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: '40px' }}
              />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card" style={{
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '2px' }}>নির্বাচিত সময়ে মোট খরচ</span>
            <h2 style={{ fontSize: '1.7rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
              {formatBDT(totalExpenseSum)}
            </h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.18)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={28} color="white" />
          </div>
        </div>

        {/* Excel & PDF Exports */}
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

        {/* Expenses List */}
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
        ) : filteredExpenses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            কোনো খরচের বিবরণ পাওয়া যায়নি
          </div>
        ) : (
          paginatedExpenses.map(exp => (
            <div 
              className="action-card" 
              key={exp._id}
              style={{
                borderLeft: '5px solid #be123c',
                padding: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{exp.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    তারিখ: {formatBanglaDate(exp.date)} · ক্যাটাগরি: <strong style={{ color: 'var(--primary)' }}>{getCategoryLabel(exp.category)}</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ 
                    fontSize: '1.1rem', 
                    color: '#e11d48', 
                    fontWeight: 800, 
                    display: 'block'
                  }}>
                    -{formatBDT(exp.amount)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    দ্বারা: {exp.recordedBy?.name || 'N/A'}
                  </span>
                </div>
              </div>

              {exp.description && (
                <div style={{ 
                  marginTop: '8px', 
                  backgroundColor: 'var(--bg-app)', 
                  padding: '6px 10px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  borderLeft: '2px solid var(--border)'
                }}>
                  {exp.description}
                </div>
              )}

              {isAdmin && (
                <div className="list-actions" style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, minHeight: '34px', gap: '2px', background: 'white' }}
                    onClick={() => handleOpenEditModal(exp)}
                  >
                    <Edit size={14} />
                    <span>সম্পাদনা</span>
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ 
                      flex: 1, 
                      minHeight: '34px', 
                      gap: '2px', 
                      backgroundColor: '#fff1f2', 
                      color: '#e11d48', 
                      border: '1px solid rgba(225, 29, 72, 0.2)' 
                    }}
                    onClick={() => handleDeleteExpense(exp._id)}
                  >
                    <Trash2 size={14} />
                    <span>মুছে ফেলুন</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Expenses Pagination */}
        {!loading && filteredExpenses.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredExpenses.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}

        {/* ----------------- MODAL: ADD EXPENSE ----------------- */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>নতুন খরচ যুক্ত করুন</h3>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddExpenseSubmit}>
                <div className="form-group">
                  <label className="form-label">খরচের নাম / শিরোনাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="যেমন: অনুষ্ঠান বাবদ খরচ, কাগজ প্রিন্টিং"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ক্যাটাগরি</label>
                  <select
                    className="form-control"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    placeholder="যেমন: ৫০০"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">বিবরণ / মন্তব্য (ঐচ্ছিক)</label>
                  <textarea
                    className="form-control"
                    placeholder="খরচ সম্পর্কে বিস্তারিত লিখুন..."
                    rows="3"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    style={{ resize: 'none', padding: '10px' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'সংরক্ষণ করা হচ্ছে...' : 'খরচ সংরক্ষণ করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: EDIT EXPENSE ----------------- */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>খরচ সম্পাদনা</h3>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditExpenseSubmit}>
                <div className="form-group">
                  <label className="form-label">খরচের নাম / শিরোনাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ক্যাটাগরি</label>
                  <select
                    className="form-control"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">তারিখ</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">বিবরণ / মন্তব্য (ঐচ্ছিক)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    style={{ resize: 'none', padding: '10px' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'আপডেট করা হচ্ছে...' : 'আপডেট সংরক্ষণ করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
        <Footer />
      </main>

      <BottomNav />
    </div>
  );
}
