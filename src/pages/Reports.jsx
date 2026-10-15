import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { toBanglaNumber, formatBDT, formatBanglaDate, formatBanglaMonth } from '../utils/bangla';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import { Printer, Info, X, Download, FileText, Award, LayoutDashboard, PiggyBank, AlertTriangle, TrendingUp, HandCoins, Receipt, Users } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const getCategoryLabel = (cat) => {
    const categories = {
      'function': 'অনুষ্ঠান',
      'document': 'কাগজপত্র ও দলিল',
      'tea_snacks': 'চা-নাস্তা',
      'office': 'অফিস খরচ',
      'other': 'অন্যান্য'
    };
    return categories[cat] || 'অন্যান্য';
  };

  // Filters
  const [filterType, setFilterType] = useState('month');
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

  // Tabs:
  // 0 = সমিতি সার্বিক রিপোর্ট, 1 = সঞ্চয় জমা, 2 = সদস্য বকেয়া
  // 3 = কিস্তি আদায়, 4 = বিনিয়োগ বকেয়া, 5 = মুনাফা, 6 = খরচ, 7 = সদস্য রিপোর্ট
  const [activeTab, setActiveTab] = useState(0);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Special data for tab 0 (overall summary) and tab 7 (member summary)
  const [summaryData, setSummaryData] = useState(null);
  const [memberSummaryData, setMemberSummaryData] = useState(null);

  // Detail modals
  const [activeMemberDetail, setActiveMemberDetail] = useState(null);
  const [activeProjectDetail, setActiveProjectDetail] = useState(null);
  const [allProjects, setAllProjects] = useState([]);

  const fetchReport = async () => {
    setError('');
    setLoading(true);
    try {
      // Tab 0: Overall samiti summary
      if (activeTab === 0) {
        const data = await apiRequest('/api/reports/dashboard');
        setSummaryData(data);
        setReportData([]);
        setLoading(false);
        return;
      }

      // Tab 1: Member summary report
      if (activeTab === 1) {
        const data = await apiRequest('/api/reports/member-summary');
        setMemberSummaryData(data.summary);
        setReportData(data.memberReport || []);
        setLoading(false);
        return;
      }

      // Build query string for tabs 2-7
      let queryParams = '';
      if (filterType === 'date' && filterDate) {
        queryParams = `?date=${filterDate}`;
      } else if (filterType === 'month' && filterMonth) {
        queryParams = `?month=${filterMonth}`;
      } else if (filterType === 'year' && filterYear) {
        queryParams = `?year=${filterYear}`;
      } else if (filterType === 'custom' && filterStartDate && filterEndDate) {
        queryParams = `?startDate=${filterStartDate}&endDate=${filterEndDate}`;
      }

      let endpoint = '';
      if (activeTab === 2) endpoint = '/api/reports/member-deposits';
      else if (activeTab === 3) endpoint = '/api/reports/member-dues';
      else if (activeTab === 4) endpoint = '/api/reports/project-collections';
      else if (activeTab === 5) endpoint = '/api/reports/project-dues';
      else if (activeTab === 6) endpoint = '/api/reports/profits';
      else if (activeTab === 7) endpoint = '/api/expenses';

      const data = await apiRequest(`${endpoint}${queryParams}`);
      setReportData(data);
    } catch (err) {
      setError(err.message || 'রিপোর্ট ডাটা লোড করা সম্ভব হয়নি');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 7) setFilterType('alltime');
  }, [activeTab]);

  useEffect(() => {
    fetchReport();
  }, [activeTab, filterType, filterDate, filterMonth, filterYear, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (isAdmin && (activeTab === 4 || activeTab === 5 || activeTab === 6)) {
      const fetchAllProjects = async () => {
        try {
          const data = await apiRequest('/api/projects');
          setAllProjects(data);
        } catch (err) {
          console.error('Failed to fetch projects for driver ranking', err);
        }
      };
      fetchAllProjects();
    }
  }, [activeTab, isAdmin]);

  const handleViewMemberDetails = async (id) => {
    try {
      const details = await apiRequest(`/api/members/${id}`);
      setActiveMemberDetail(details);
    } catch (err) {
      toast.error('সদস্য তথ্য লোড করা সম্ভব হয়নি');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewProjectDetails = async (id) => {
    try {
      const details = await apiRequest(`/api/projects/${id}`);
      setActiveProjectDetail(details);
    } catch (err) {
      toast.error('বিনিয়োগ তথ্য লোড করা সম্ভব হয়নি');
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 0 || activeTab === 1) {
      // For summary tabs export the member list table
      if (activeTab === 1 && memberSummaryData) {
        const cols = [
          { header: 'সদস্য আইডি', key: 'memberId' },
          { header: 'সদস্য নাম', key: 'name' },
          { header: 'মোবাইল', key: 'mobile' },
          { header: 'মাসিক কিস্তি', key: 'monthlyDepositAmountFormatted' },
          { header: 'মোট জমাকৃত', key: 'totalDepositedFormatted' },
          { header: 'জমার শেয়ার %', key: 'sharePercent' },
          { header: 'মোট বকেয়া', key: 'totalDueFormatted' },
          { header: 'বর্তমান মুনাফা', key: 'currentProfitFormatted' },
          { header: 'ভবিষ্যৎ মুনাফা', key: 'futureProfitFormatted' },
          { header: 'বর্তমান ব্যালেন্স', key: 'currentBalanceFormatted' },
          { header: 'ভবিষ্যৎ ব্যালেন্স', key: 'futureBalanceFormatted' },
          { header: 'অবস্থা', key: 'statusFormatted' },
        ];
        const dataToExport = reportData.map(row => ({
          memberId: row.memberId,
          name: row.name,
          mobile: row.mobile,
          monthlyDepositAmountFormatted: formatBDT(row.monthlyDepositAmount),
          totalDepositedFormatted: formatBDT(row.totalDeposited),
          sharePercent: toBanglaNumber(row.depositSharePercent || 0) + '%',
          totalDueFormatted: formatBDT(row.totalDue),
          currentProfitFormatted: formatBDT(row.currentProfit || 0),
          futureProfitFormatted: formatBDT(row.futureProfit || 0),
          currentBalanceFormatted: formatBDT(row.currentBalance || 0),
          futureBalanceFormatted: formatBDT(row.futureBalance || 0),
          statusFormatted: row.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
        }));
        exportToExcel(dataToExport, cols, 'Member_Report', 'সদস্য রিপোর্ট');
      }
      return;
    }

    let cols = [], dataToExport = [], filename = '', sheetName = '';

    if (activeTab === 2) {
      cols = [
        { header: 'সদস্য আইডি', key: 'memberId' },
        { header: 'সদস্য নাম', key: 'memberName' },
        { header: 'মোবাইল', key: 'memberMobile' },
        { header: 'তারিখ', key: 'dateFormatted' },
        { header: 'মাস', key: 'monthFormatted' },
        { header: 'পরিমাণ', key: 'amountFormatted' },
        { header: 'সংগ্রহকারী', key: 'recordedBy' },
      ];
      dataToExport = reportData.map(row => ({
        memberId: row.member?.memberId || '',
        memberName: row.member?.name || 'মুছে ফেলা সদস্য',
        memberMobile: row.member?.mobile || '',
        dateFormatted: formatBanglaDate(row.date),
        monthFormatted: formatBanglaMonth(row.month),
        amountFormatted: formatBDT(row.amount),
        recordedBy: row.recordedBy?.name || 'N/A',
      }));
      filename = 'Savings_Deposits'; sheetName = 'সঞ্চয় জমা';
    } else if (activeTab === 3) {
      cols = [
        { header: 'সদস্য আইডি', key: 'memberId' },
        { header: 'সদস্য নাম', key: 'name' },
        { header: 'মোবাইল', key: 'mobile' },
        { header: 'মাসিক সঞ্চয় কিস্তি', key: 'monthlyDepositAmountFormatted' },
        { header: 'মোট জমাকৃত', key: 'totalDepositedFormatted' },
        { header: 'মোট বকেয়া', key: 'totalDueFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      dataToExport = reportData.map(row => ({
        memberId: row.memberId,
        name: row.name,
        mobile: row.mobile,
        monthlyDepositAmountFormatted: formatBDT(row.monthlyDepositAmount),
        totalDepositedFormatted: formatBDT(row.totalDeposited),
        totalDueFormatted: formatBDT(row.totalDue),
        statusFormatted: row.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      }));
      filename = 'Member_Dues'; sheetName = 'সদস্য বকেয়া';
    } else if (activeTab === 4) {
      cols = [
        { header: 'প্রজেক্ট নাম', key: 'projectName' },
        { header: 'প্রজেক্ট ধরন', key: 'projectType' },
        { header: 'চালক নাম', key: 'driverName' },
        { header: 'তারিখ', key: 'dateFormatted' },
        { header: 'মাস', key: 'monthFormatted' },
        { header: 'আদায় পরিমাণ', key: 'amountFormatted' },
        { header: 'সংগ্রহকারী', key: 'recordedBy' },
      ];
      dataToExport = reportData.map(row => ({
        projectName: row.project?.projectName || 'মুছে ফেলা প্রজেক্ট',
        projectType: row.project?.projectType || 'N/A',
        driverName: row.project?.driverName || '',
        dateFormatted: formatBanglaDate(row.date),
        monthFormatted: formatBanglaMonth(row.month),
        amountFormatted: formatBDT(row.amount),
        recordedBy: row.recordedBy?.name || 'N/A',
      }));
      filename = 'Project_Collections'; sheetName = 'কিস্তি আদায়';
    } else if (activeTab === 5) {
      cols = [
        { header: 'প্রজেক্ট নাম', key: 'projectName' },
        { header: 'বিনিয়োগ পরিমাণ', key: 'investmentAmountFormatted' },
        { header: 'মোট ফেরত লক্ষ্য', key: 'returnAmountFormatted' },
        { header: 'মাসিক কিস্তি হার', key: 'monthlyInstallmentAmountFormatted' },
        { header: 'মোট আদায়কৃত', key: 'totalPaidFormatted' },
        { header: 'অবशिष्ट পাওনা', key: 'remainingBalanceFormatted' },
        { header: 'মোট বকেয়া', key: 'totalDueFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      dataToExport = reportData.map(row => ({
        projectName: row.projectName,
        investmentAmountFormatted: formatBDT(row.investmentAmount),
        returnAmountFormatted: formatBDT(row.returnAmount),
        monthlyInstallmentAmountFormatted: formatBDT(row.monthlyInstallmentAmount),
        totalPaidFormatted: formatBDT(row.totalPaid),
        remainingBalanceFormatted: formatBDT(row.remainingBalance),
        totalDueFormatted: formatBDT(row.totalDue),
        statusFormatted: row.status === 'completed' ? 'সম্পন্ন' : (row.status === 'due' ? 'বকেয়া' : 'চলতি'),
      }));
      filename = 'Project_Dues'; sheetName = 'বিনিয়োগ বকেয়া';
    } else if (activeTab === 6) {
      cols = [
        { header: 'প্রজেক্ট নাম', key: 'projectName' },
        { header: 'বিনিয়োগ পরিমাণ', key: 'investmentAmountFormatted' },
        { header: 'ফেরত লক্ষ্য', key: 'returnAmountFormatted' },
        { header: 'মোট আদায়কৃত', key: 'totalPaidFormatted' },
        { header: 'অর্জিত মুনাফা', key: 'currentProfitFormatted' },
        { header: 'ভবিষ্যৎ মুনাফা', key: 'futureProfitFormatted' },
        { header: 'মোট মুনাফা', key: 'profitFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      dataToExport = reportData.map(row => ({
        projectName: row.projectName,
        investmentAmountFormatted: formatBDT(row.investmentAmount),
        returnAmountFormatted: formatBDT(row.returnAmount),
        totalPaidFormatted: formatBDT(row.totalPaid),
        currentProfitFormatted: formatBDT(row.currentProfit || 0),
        futureProfitFormatted: formatBDT(row.futureProfit || 0),
        profitFormatted: formatBDT(row.profit),
        statusFormatted: row.status === 'completed' ? 'সম্পন্ন' : (row.status === 'due' ? 'বকেয়া' : 'চলতি'),
      }));
      filename = 'Profit_Report'; sheetName = 'মুনাফা রিপোর্ট';
    } else if (activeTab === 7) {
      cols = [
        { header: 'শিরোনাম', key: 'title' },
        { header: 'ক্যাটাগরি', key: 'categoryLabel' },
        { header: 'পরিমাণ', key: 'amountFormatted' },
        { header: 'তারিখ', key: 'dateFormatted' },
        { header: 'রেকর্ডকারী', key: 'recordedBy' },
        { header: 'বিবরণ', key: 'description' },
      ];
      dataToExport = reportData.map(row => ({
        title: row.title,
        categoryLabel: getCategoryLabel(row.category),
        amountFormatted: formatBDT(row.amount),
        dateFormatted: formatBanglaDate(row.date),
        recordedBy: row.recordedBy?.name || 'N/A',
        description: row.description || '',
      }));
      filename = 'Expense_Report'; sheetName = 'খরচ রিপোর্ট';
    }

    exportToExcel(dataToExport, cols, filename, sheetName);
  };

  // ─── PDF Export ───────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (activeTab === 0) {
      // Export overall summary as PDF
      if (!summaryData) return;
      const currentBalance = (summaryData.totalDeposits || 0) + (summaryData.totalInstallmentsCollected || 0) - (summaryData.totalInvestments || 0) - (summaryData.totalExpenses || 0);
      const cols = [
        { header: 'বিবরণ', key: 'label' },
        { header: 'পরিমাণ / সংখ্যা', key: 'value' },
      ];
      const dataToExport = [
        { label: 'মোট সদস্য', value: toBanglaNumber(summaryData.totalMembers) + ' জন' },
        { label: 'মোট সঞ্চয় জমা', value: formatBDT(summaryData.totalDeposits) },
        { label: 'মোট কিস্তি আদায়', value: formatBDT(summaryData.totalInstallmentsCollected) },
        { label: 'মোট বিনিয়োগ', value: formatBDT(summaryData.totalInvestments) },
        { label: 'মোট খরচ', value: formatBDT(summaryData.totalExpenses) },
        { label: 'বর্তমান তহবিল ব্যালেন্স', value: formatBDT(currentBalance) },
        { label: 'সদস্য সঞ্চয় বকেয়া', value: formatBDT(summaryData.memberDueAmount) },
        { label: 'প্রজেক্ট কিস্তি বকেয়া', value: formatBDT(summaryData.projectDueAmount) },
        { label: 'সর্বমোট বকেয়া', value: formatBDT(summaryData.totalDueAmount) },
        { label: 'টার্গেটকৃত মোট মুনাফা', value: formatBDT(summaryData.totalProfit) },
        { label: 'আদায়কৃত মোট মুনাফা', value: formatBDT(summaryData.totalRealizedProfit || 0) },
        { label: 'সক্রিয় প্রজেক্ট', value: toBanglaNumber(summaryData.activeProjects) + ' টি' },
      ];
      exportToPDF(dataToExport, cols, 'সমিতি সার্বিক রিপোর্ট', 'Samiti_Overall_Report');
      return;
    }

    if (activeTab === 1) {
      const cols = [
        { header: 'সদস্য আইডি', key: 'memberId' },
        { header: 'সদস্য নাম', key: 'name' },
        { header: 'মোবাইল', key: 'mobile' },
        { header: 'মাসিক কিস্তি', key: 'monthlyDepositAmountFormatted' },
        { header: 'মোট জমাকৃত', key: 'totalDepositedFormatted' },
        { header: 'জমার শেয়ার %', key: 'sharePercent' },
        { header: 'মোট বকেয়া', key: 'totalDueFormatted' },
        { header: 'বর্তমান মুনাফা', key: 'currentProfitFormatted' },
        { header: 'ভবিষ্যৎ মুনাফা', key: 'futureProfitFormatted' },
        { header: 'বর্তমান ব্যালেন্স', key: 'currentBalanceFormatted' },
        { header: 'ভবিষ্যৎ ব্যালেন্স', key: 'futureBalanceFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      const dataToExport = reportData.map(row => ({
        memberId: row.memberId,
        name: row.name,
        mobile: row.mobile,
        monthlyDepositAmountFormatted: formatBDT(row.monthlyDepositAmount),
        totalDepositedFormatted: formatBDT(row.totalDeposited),
        sharePercent: toBanglaNumber(row.depositSharePercent || 0) + '%',
        totalDueFormatted: formatBDT(row.totalDue),
        currentProfitFormatted: formatBDT(row.currentProfit || 0),
        futureProfitFormatted: formatBDT(row.futureProfit || 0),
        currentBalanceFormatted: formatBDT(row.currentBalance || 0),
        futureBalanceFormatted: formatBDT(row.futureBalance || 0),
        statusFormatted: row.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      }));
      exportToPDF(dataToExport, cols, 'সদস্য রিপোর্ট', 'Member_Report', memberSummaryData);
      return;
    }

    let cols = [], dataToExport = [], title = '', filename = '';

    if (activeTab === 2) {
      cols = [
        { header: 'সদস্য আইডি', key: 'memberId' },
        { header: 'সদস্য নাম', key: 'memberName' },
        { header: 'মোবাইল', key: 'memberMobile' },
        { header: 'তারিখ', key: 'dateFormatted' },
        { header: 'মাস', key: 'monthFormatted' },
        { header: 'পরিমাণ', key: 'amountFormatted' },
        { header: 'সংগ্রহকারী', key: 'recordedBy' },
      ];
      dataToExport = reportData.map(row => ({
        memberId: row.member?.memberId || '',
        memberName: row.member?.name || 'মুছে ফেলা সদস্য',
        memberMobile: row.member?.mobile || '',
        dateFormatted: formatBanglaDate(row.date),
        monthFormatted: formatBanglaMonth(row.month),
        amountFormatted: formatBDT(row.amount),
        recordedBy: row.recordedBy?.name || 'N/A',
      }));
      title = 'সঞ্চয় জমা রিপোর্ট'; filename = 'Savings_Deposits';
    } else if (activeTab === 3) {
      cols = [
        { header: 'সদস্য আইডি', key: 'memberId' },
        { header: 'সদস্য নাম', key: 'name' },
        { header: 'মোবাইল', key: 'mobile' },
        { header: 'মাসিক সঞ্চয় কিস্তি', key: 'monthlyDepositAmountFormatted' },
        { header: 'মোট জমাকৃত', key: 'totalDepositedFormatted' },
        { header: 'মোট বকেয়া', key: 'totalDueFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      dataToExport = reportData.map(row => ({
        memberId: row.memberId,
        name: row.name,
        mobile: row.mobile,
        monthlyDepositAmountFormatted: formatBDT(row.monthlyDepositAmount),
        totalDepositedFormatted: formatBDT(row.totalDeposited),
        totalDueFormatted: formatBDT(row.totalDue),
        statusFormatted: row.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      }));
      title = 'সদস্য বকেয়া রিপোর্ট'; filename = 'Member_Dues';
    } else if (activeTab === 4) {
      cols = [
        { header: 'প্রজেক্ট নাম', key: 'projectName' },
        { header: 'প্রজেক্ট ধরন', key: 'projectType' },
        { header: 'চালক নাম', key: 'driverName' },
        { header: 'তারিখ', key: 'dateFormatted' },
        { header: 'মাস', key: 'monthFormatted' },
        { header: 'আদায় পরিমাণ', key: 'amountFormatted' },
        { header: 'সংগ্রহকারী', key: 'recordedBy' },
      ];
      dataToExport = reportData.map(row => ({
        projectName: row.project?.projectName || 'মুছে ফেলা প্রজেক্ট',
        projectType: row.project?.projectType || 'N/A',
        driverName: row.project?.driverName || '',
        dateFormatted: formatBanglaDate(row.date),
        monthFormatted: formatBanglaMonth(row.month),
        amountFormatted: formatBDT(row.amount),
        recordedBy: row.recordedBy?.name || 'N/A',
      }));
      title = 'প্রজেক্ট কিস্তি আদায় রিপোর্ট'; filename = 'Project_Collections';
    } else if (activeTab === 5) {
      cols = [
        { header: 'প্রজেক্ট নাম', key: 'projectName' },
        { header: 'বিনিয়োগ পরিমাণ', key: 'investmentAmountFormatted' },
        { header: 'মোট ফেরত লক্ষ্য', key: 'returnAmountFormatted' },
        { header: 'মাসিক কিস্তি হার', key: 'monthlyInstallmentAmountFormatted' },
        { header: 'মোট আদায়কৃত', key: 'totalPaidFormatted' },
        { header: 'অবशिष्ट পাওনা', key: 'remainingBalanceFormatted' },
        { header: 'মোট বকেয়া', key: 'totalDueFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      dataToExport = reportData.map(row => ({
        projectName: row.projectName,
        investmentAmountFormatted: formatBDT(row.investmentAmount),
        returnAmountFormatted: formatBDT(row.returnAmount),
        monthlyInstallmentAmountFormatted: formatBDT(row.monthlyInstallmentAmount),
        totalPaidFormatted: formatBDT(row.totalPaid),
        remainingBalanceFormatted: formatBDT(row.remainingBalance),
        totalDueFormatted: formatBDT(row.totalDue),
        statusFormatted: row.status === 'completed' ? 'সম্পন্ন' : (row.status === 'due' ? 'বকেয়া' : 'চলতি'),
      }));
      title = 'বিনিয়োগ বকেয়া রিপোর্ট'; filename = 'Project_Dues';
    } else if (activeTab === 6) {
      cols = [
        { header: 'প্রজেক্ট নাম', key: 'projectName' },
        { header: 'বিনিয়োগ পরিমাণ', key: 'investmentAmountFormatted' },
        { header: 'ফেরত লক্ষ্য', key: 'returnAmountFormatted' },
        { header: 'মোট আদায়কৃত', key: 'totalPaidFormatted' },
        { header: 'অর্জিত মুনাফা', key: 'currentProfitFormatted' },
        { header: 'ভবিষ্যৎ মুনাফা', key: 'futureProfitFormatted' },
        { header: 'মোট মুনাফা', key: 'profitFormatted' },
        { header: 'অবস্থা', key: 'statusFormatted' },
      ];
      dataToExport = reportData.map(row => ({
        projectName: row.projectName,
        investmentAmountFormatted: formatBDT(row.investmentAmount),
        returnAmountFormatted: formatBDT(row.returnAmount),
        totalPaidFormatted: formatBDT(row.totalPaid),
        currentProfitFormatted: formatBDT(row.currentProfit || 0),
        futureProfitFormatted: formatBDT(row.futureProfit || 0),
        profitFormatted: formatBDT(row.profit),
        statusFormatted: row.status === 'completed' ? 'সম্পন্ন' : (row.status === 'due' ? 'বকেয়া' : 'চলতি'),
      }));
      title = 'মুনাফা রিপোর্ট'; filename = 'Profit_Report';
    } else if (activeTab === 7) {
      cols = [
        { header: 'শিরোনাম', key: 'title' },
        { header: 'ক্যাটাগরি', key: 'categoryLabel' },
        { header: 'পরিমাণ', key: 'amountFormatted' },
        { header: 'তারিখ', key: 'dateFormatted' },
        { header: 'রেকর্ডকারী', key: 'recordedBy' },
      ];
      dataToExport = reportData.map(row => ({
        title: row.title,
        categoryLabel: getCategoryLabel(row.category),
        amountFormatted: formatBDT(row.amount),
        dateFormatted: formatBanglaDate(row.date),
        recordedBy: row.recordedBy?.name || 'N/A',
      }));
      title = 'খরচ হিসাব রিপোর্ট'; filename = 'Expense_Report';
    }

    exportToPDF(dataToExport, cols, title, filename);
  };

// ─── Tabs config ──────────────────────────────────────────────────────────
const tabs = [
  { id: 0, label: 'সার্বিক রিপোর্ট', icon: <LayoutDashboard size={13} /> },
  { id: 1, label: 'সদস্য রিপোর্ট', icon: <Users size={13} /> },
  { id: 2, label: 'সঞ্চয় জমা', icon: <PiggyBank size={13} /> },
  { id: 3, label: 'সদস্য বকেয়া', icon: <AlertTriangle size={13} /> },
  { id: 4, label: 'কিস্তি আদায়', icon: <HandCoins size={13} /> },
  { id: 5, label: 'বিনিয়োগ বকেয়া', icon: <AlertTriangle size={13} /> },
  { id: 6, label: 'মুনাফা', icon: <TrendingUp size={13} /> },
  { id: 7, label: 'খরচ', icon: <Receipt size={13} /> },
];

// Show filters only for tabs 2, 4, 7
const showFilters = [2, 4, 7].includes(activeTab);

// ─── Helper: summary stat box ─────────────────────────────────────────────
const StatBox = ({ label, value, color = 'var(--primary)', bg = 'var(--bg-app)' }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', backgroundColor: bg,
    padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{label}</span>
    <strong style={{ fontSize: '1rem', color }}>{value}</strong>
  </div>
);

return (
  <div className="app-container">
    <Header title="রিপোর্ট ও হিসাব" />

    <main className="content-wrapper">

      {/* ── Tab Buttons ──────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '0.8rem' }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters Panel ────────────────────────────────────────── */}
      {showFilters && (
        <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {['date', 'month', 'year', 'custom', 'alltime'].map((type, i) => (
              <button
                key={type}
                className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, minHeight: '36px', minWidth: '70px' }}
                onClick={() => setFilterType(type)}
              >
                {['তারিখ', 'মাস', 'বছর', 'কাস্টম', 'সব সময়'][i]}
              </button>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            {filterType === 'date' && (
              <input type="date" className="form-control" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            )}
            {filterType === 'month' && (
              <input type="month" className="form-control" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
            )}
            {filterType === 'year' && (
              <select className="form-control" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                {['2024', '2025', '2026', '2027', '2028'].map(y => (
                  <option key={y} value={y}>{toBanglaNumber(y)} সাল</option>
                ))}
              </select>
            )}
            {filterType === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>শুরুর তারিখ</label>
                  <input type="date" className="form-control" value={filterStartDate} max={filterEndDate} onChange={e => setFilterStartDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>শেষ তারিখ</label>
                  <input type="date" className="form-control" value={filterEndDate} min={filterStartDate} onChange={e => setFilterEndDate(e.target.value)} />
                </div>
              </div>
            )}
            {filterType === 'alltime' && (
              <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                📋 সকল সময়ের সমস্ত রেকর্ড দেখানো হচ্ছে
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Driver Ranking (Admin only, tabs 4/5/6) ──────────────── */}
      {isAdmin && (activeTab === 4 || activeTab === 5 || activeTab === 6) && allProjects.length > 0 && (
        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={18} />
            <span>কিস্তি পরিশোধের ভিত্তিতে চালকদের র্যাংকিং</span>
          </h3>
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div style={{ backgroundColor: 'var(--success-light)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--success)', marginBottom: '8px', fontWeight: 'bold' }}>🏆 সেরা চালক</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  const sorted = [...allProjects].map(p => {
                    const expected = Math.min(p.installmentDuration, p.monthsElapsed || 0) * p.monthlyInstallmentAmount;
                    const pct = expected > 0 ? Math.round((p.totalPaid / expected) * 100) : 100;
                    return { ...p, pct };
                  }).sort((a, b) => b.pct - a.pct);
                  return sorted.slice(0, 3).map((p, idx) => (
                    <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '4px 0', borderBottom: idx < 2 ? '1px dashed rgba(22, 163, 74, 0.15)' : 'none' }}>
                      <div>
                        <strong style={{ color: 'var(--text-main)' }}>{p.driverName}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({p.projectName})</span>
                      </div>
                      <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{toBanglaNumber(p.pct)}%</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--danger-light)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '8px', fontWeight: 'bold' }}>⚠️ বকেয়া চালক</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  const sorted = [...allProjects].map(p => {
                    const expected = Math.min(p.installmentDuration, p.monthsElapsed || 0) * p.monthlyInstallmentAmount;
                    const pct = expected > 0 ? Math.round((p.totalPaid / expected) * 100) : 100;
                    return { ...p, pct };
                  }).sort((a, b) => a.pct - b.pct);
                  return sorted.slice(0, 3).map((p, idx) => (
                    <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '4px 0', borderBottom: idx < 2 ? '1px dashed rgba(220, 38, 38, 0.15)' : 'none' }}>
                      <div>
                        <strong style={{ color: 'var(--text-main)' }}>{p.driverName}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({p.projectName})</span>
                      </div>
                      <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{toBanglaNumber(p.pct)}% ({formatBDT(p.totalDue)})</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Print / Export Row ───────────────────────────────────── */}
      {activeTab !== 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            মোট রেকর্ড: <strong>{toBanglaNumber(reportData.length)}</strong> টি
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline btn-sm" style={{ width: 'auto', minHeight: '36px', gap: '4px', padding: '6px 10px', fontSize: '0.8rem', background: 'white' }} onClick={handlePrint}>
              <Printer size={14} />
              <span>প্রিন্ট</span>
            </button>
            <button className="btn btn-outline btn-sm" style={{ width: 'auto', minHeight: '36px', gap: '4px', padding: '6px 10px', fontSize: '0.8rem', background: 'white', color: 'var(--success)' }} onClick={handleExportExcel}>
              <FileText size={14} color="#16a34a" />
              <span>Excel</span>
            </button>
            <button className="btn btn-outline btn-sm" style={{ width: 'auto', minHeight: '36px', gap: '4px', padding: '6px 10px', fontSize: '0.8rem', background: 'white', color: 'var(--danger)' }} onClick={handleExportPDF}>
              <Download size={14} color="#dc2626" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)', fontWeight: 600 }}>⚠️ {error}</div>
      )}

      {/* ═══════════════════════════════════════════════════════════
            TAB 0 — সমিতি সার্বিক রিপোর্ট
        ═══════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><span style={{ fontWeight: 600 }}>লোড হচ্ছে...</span></div>
          ) : summaryData ? (() => {
            const currentBalance = (summaryData.totalDeposits || 0) + (summaryData.totalInstallmentsCollected || 0) - (summaryData.totalInvestments || 0) - (summaryData.totalExpenses || 0);
            const realizedProfit = summaryData.totalRealizedProfit || 0;
            return (
              <div>
                {/* Hero Balance Card */}
                <div className="card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', color: 'white', border: 'none', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '4px' }}>সমিতির বর্তমান তহবিল ব্যালেন্স</span>
                    <h2 style={{ fontSize: '2rem', color: 'white', fontWeight: 800, margin: 0 }}>{formatBDT(currentBalance)}</h2>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>সর্বমোট বকেয়া: <strong style={{ color: '#fde047' }}>{formatBDT(summaryData.totalDueAmount)}</strong></span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '14px', borderRadius: '50%', flexShrink: 0 }}>
                    <LayoutDashboard size={32} color="white" />
                  </div>
                </div>

                {/* Profit Card */}
                <div className="card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', border: 'none', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '2px' }}>প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</span>
                    <h2 style={{ fontSize: '1.7rem', color: 'white', fontWeight: 800, margin: 0 }}>{formatBDT(summaryData.totalProfit)}</h2>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>আদায়কৃত মোট মুনাফা: <strong style={{ color: '#bbf7d0' }}>{formatBDT(realizedProfit)}</strong></span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '12px', borderRadius: '50%', flexShrink: 0 }}>
                    <TrendingUp size={28} color="white" />
                  </div>
                </div>

                {/* Stats Grid Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <StatBox label="মোট সদস্য" value={toBanglaNumber(summaryData.totalMembers) + ' জন'} color="var(--primary)" />
                  <StatBox label="সক্রিয় প্রজেক্ট" value={toBanglaNumber(summaryData.activeProjects) + ' টি'} color="var(--accent)" />
                  <StatBox label="মোট সঞ্চয় জমা" value={formatBDT(summaryData.totalDeposits)} color="var(--success)" />
                  <StatBox label="মোট কিস্তি আদায়" value={formatBDT(summaryData.totalInstallmentsCollected)} color="var(--success)" />
                </div>

                {/* Stats Grid Row 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <StatBox label="মোট বিনিয়োগ" value={formatBDT(summaryData.totalInvestments)} color="var(--accent)" />
                  <StatBox label="মোট খরচ (ব্যয়)" value={formatBDT(summaryData.totalExpenses || 0)} color="#e11d48" />
                  <StatBox label="সদস্য সঞ্চয় বকেয়া" value={formatBDT(summaryData.memberDueAmount)} color="var(--danger)" />
                  <StatBox label="প্রজেক্ট কিস্তি বকেয়া" value={formatBDT(summaryData.projectDueAmount)} color="var(--danger)" />
                </div>

                {/* Detailed Summary Table */}
                <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '14px', fontWeight: 'bold', borderLeft: '4px solid var(--primary)', paddingLeft: '10px' }}>
                    📊 বিস্তারিত আর্থিক সারসংক্ষেপ
                  </h4>
                  <div className="table-container" style={{ marginBottom: '0' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>বিভাগ</th>
                          <th>বিবরণ</th>
                          <th style={{ textAlign: 'right' }}>পরিমাণ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>আয়</td>
                          <td>মোট সঞ্চয় জমা (সদস্যদের কাছ থেকে)</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(summaryData.totalDeposits)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>আয়</td>
                          <td>মোট কিস্তি আদায় (প্রজেক্ট থেকে)</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(summaryData.totalInstallmentsCollected)}</td>
                        </tr>
                        <tr style={{ backgroundColor: 'rgba(22,163,74,0.06)' }}>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>মোট আয়</td>
                          <td style={{ fontWeight: 600 }}>সমস্ত উৎস থেকে মোট প্রাপ্তি</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>{formatBDT((summaryData.totalDeposits || 0) + (summaryData.totalInstallmentsCollected || 0))}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>বিনিয়োগ</td>
                          <td>মোট প্রজেক্টে বিনিয়োগ</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>- {formatBDT(summaryData.totalInvestments)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', color: '#e11d48' }}>ব্যয়</td>
                          <td>মোট খরচ / ব্যয়</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>- {formatBDT(summaryData.totalExpenses || 0)}</td>
                        </tr>
                        <tr style={{ backgroundColor: 'rgba(15,118,110,0.08)', borderTop: '2px solid var(--primary)' }}>
                          <td style={{ fontWeight: 800, color: '#0f766e' }}>নিট ব্যালেন্স</td>
                          <td style={{ fontWeight: 600 }}>বর্তমান তহবিল ব্যালেন্স</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f766e' }}>{formatBDT(currentBalance)}</td>
                        </tr>
                        <tr style={{ borderTop: '1px dashed #e2e8f0' }}>
                          <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>বকেয়া</td>
                          <td>সদস্য সঞ্চয় বকেয়া</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>{formatBDT(summaryData.memberDueAmount)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>বকেয়া</td>
                          <td>প্রজেক্ট কিস্তি বকেয়া</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>{formatBDT(summaryData.projectDueAmount)}</td>
                        </tr>
                        <tr style={{ backgroundColor: 'rgba(220,38,38,0.06)' }}>
                          <td style={{ fontWeight: 800, color: 'var(--danger)' }}>মোট বকেয়া</td>
                          <td style={{ fontWeight: 600 }}>সর্বমোট আদায়যোগ্য বকেয়া</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>{formatBDT(summaryData.totalDueAmount)}</td>
                        </tr>
                        <tr style={{ borderTop: '1px dashed #e2e8f0' }}>
                          <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>মুনাফা</td>
                          <td>প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{formatBDT(summaryData.totalProfit)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>মুনাফা</td>
                          <td>এ পর্যন্ত আদায়কৃত মোট মুনাফা</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(realizedProfit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Export PDF button for summary */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" style={{ width: 'auto', padding: '8px 14px', color: 'var(--danger)', background: 'white' }} onClick={handleExportPDF}>
                    <Download size={14} color="#dc2626" />
                    <span>PDF ডাউনলোড</span>
                  </button>
                </div>
              </div>
            );
          })() : null}
        </div>
      )}

      {/* Loading spinner for tabs 1-7 */}
      {activeTab !== 0 && loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
          <svg style={{ animation: 'spin 1s linear infinite', width: '36px', height: '36px', color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</span>
        </div>
      )}

      {/* No data */}
      {activeTab !== 0 && !loading && reportData.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
          কোনো ডাটা পাওয়া যায়নি
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
            TABS 2–7 — Report Tables with tfoot totals
        ═══════════════════════════════════════════════════════════ */}
      {!loading && reportData.length > 0 && activeTab !== 0 && activeTab !== 1 && (
        <div>
          <div className="table-container">

            {/* ── Tab 2: Member Savings Deposits ── */}
            {activeTab === 2 && (
              <table>
                <thead>
                  <tr>
                    <th>সদস্য আইডি</th><th>সদস্য নাম</th><th>মোবাইল</th><th>তারিখ</th><th>মাস</th><th>পরিমাণ</th><th>সংগ্রহকারী</th><th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td>{toBanglaNumber(row.member?.memberId || '')}</td>
                      <td style={{ fontWeight: 'bold' }}>{row.member?.name || 'মুছে ফেলা সদস্য'}</td>
                      <td>{toBanglaNumber(row.member?.mobile || '')}</td>
                      <td>{formatBanglaDate(row.date)}</td>
                      <td>{formatBanglaMonth(row.month)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(row.amount)}</td>
                      <td>{row.recordedBy?.name || 'N/A'}</td>
                      <td>
                        {row.member && (
                          <button className="btn btn-outline btn-sm" style={{ padding: '2px 6px', minHeight: '28px' }} onClick={() => handleViewMemberDetails(row.member._id)}>
                            <Info size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdfa', fontWeight: 800, borderTop: '2px solid var(--primary)' }}>
                    <td colSpan={5} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট</td>
                    <td style={{ color: 'var(--success)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.amount || 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── Tab 3: Member Dues ── */}
            {activeTab === 3 && (
              <table>
                <thead>
                  <tr>
                    <th>সদস্য আইডি</th><th>সদস্য নাম</th><th>মোবাইল</th><th>মাসিক কিস্তি</th><th>মোট জমাকৃত</th><th>মোট বকেয়া</th><th>অবস্থা</th><th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td>{toBanglaNumber(row.memberId)}</td>
                      <td style={{ fontWeight: 'bold' }}>{row.name}</td>
                      <td>{toBanglaNumber(row.mobile)}</td>
                      <td>{formatBDT(row.monthlyDepositAmount)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(row.totalDeposited)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{formatBDT(row.totalDue)}</td>
                      <td><span className={`list-badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{row.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ padding: '2px 6px', minHeight: '28px' }} onClick={() => handleViewMemberDetails(row._id)}>
                          <Info size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#fff7f7', fontWeight: 800, borderTop: '2px solid var(--danger)' }}>
                    <td colSpan={3} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.monthlyDepositAmount || 0), 0))}</td>
                    <td style={{ color: 'var(--success)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalDeposited || 0), 0))}</td>
                    <td style={{ color: 'var(--danger)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalDue || 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── Tab 4: Project Installment Collections ── */}
            {activeTab === 4 && (
              <table>
                <thead>
                  <tr>
                    <th>প্রজেক্ট নাম</th><th>ধরন</th><th>চালক নাম</th><th>মোবাইল</th><th>তারিখ</th><th>মাস</th><th>আদায়</th><th>সংগ্রহকারী</th><th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td style={{ fontWeight: 'bold' }}>{row.project?.projectName || 'মুছে ফেলা প্রজেক্ট'}</td>
                      <td>{row.project?.projectType || 'N/A'}</td>
                      <td>{row.project?.driverName || 'N/A'}</td>
                      <td>{toBanglaNumber(row.project?.driverMobile || '')}</td>
                      <td>{formatBanglaDate(row.date)}</td>
                      <td>{formatBanglaMonth(row.month)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(row.amount)}</td>
                      <td>{row.recordedBy?.name || 'N/A'}</td>
                      <td>
                        {row.project && (
                          <button className="btn btn-outline btn-sm" style={{ padding: '2px 6px', minHeight: '28px' }} onClick={() => handleViewProjectDetails(row.project._id)}>
                            <Info size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdfa', fontWeight: 800, borderTop: '2px solid var(--primary)' }}>
                    <td colSpan={6} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট আদায়</td>
                    <td style={{ color: 'var(--success)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.amount || 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── Tab 5: Project Dues ── */}
            {activeTab === 5 && (
              <table>
                <thead>
                  <tr>
                    <th>প্রজেক্ট নাম</th><th>ধরন</th><th>চালক নাম</th><th>বিনিয়োগ</th><th>ফেরত লক্ষ্য</th><th>মাসিক কিস্তি</th><th>মোট আদায়কৃত</th><th>অবশিষ্ট পাওনা</th><th>মোট বকেয়া</th><th>অবস্থা</th><th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td style={{ fontWeight: 'bold' }}>{row.projectName}</td>
                      <td>{row.projectType}</td>
                      <td>{row.driverName}</td>
                      <td>{formatBDT(row.investmentAmount)}</td>
                      <td>{formatBDT(row.returnAmount)}</td>
                      <td>{formatBDT(row.monthlyInstallmentAmount)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(row.totalPaid)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{formatBDT(row.remainingBalance)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{formatBDT(row.totalDue)}</td>
                      <td><span className={`list-badge ${row.status === 'completed' ? 'badge-success' : row.status === 'due' ? 'badge-danger' : 'badge-warning'}`}>{row.status === 'completed' ? 'সম্পন্ন' : row.status === 'due' ? 'বকেয়া' : 'চলতি'}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ padding: '2px 6px', minHeight: '28px' }} onClick={() => handleViewProjectDetails(row._id)}>
                          <Info size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#fff7f7', fontWeight: 800, borderTop: '2px solid var(--danger)' }}>
                    <td colSpan={3} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.investmentAmount || 0), 0))}</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.returnAmount || 0), 0))}</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.monthlyInstallmentAmount || 0), 0))}</td>
                    <td style={{ color: 'var(--success)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalPaid || 0), 0))}</td>
                    <td style={{ color: 'var(--accent)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.remainingBalance || 0), 0))}</td>
                    <td style={{ color: 'var(--danger)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalDue || 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── Tab 6: Profit Report ── */}
            {activeTab === 6 && (
              <table>
                <thead>
                  <tr>
                    <th>প্রজেক্ট নাম</th><th>ধরন</th><th>চালক নাম</th><th>বিনিয়োগ</th><th>ফেরত লক্ষ্য</th><th>মোট আদায়কৃত</th><th>অর্জিত মুনাফা</th><th>ভবিষ্যৎ মুনাফা</th><th>মোট মুনাফা</th><th>অবস্থা</th><th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td style={{ fontWeight: 'bold' }}>{row.projectName}</td>
                      <td>{row.projectType}</td>
                      <td>{row.driverName || 'N/A'}</td>
                      <td>{formatBDT(row.investmentAmount)}</td>
                      <td>{formatBDT(row.returnAmount)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(row.totalPaid)}</td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>{formatBDT(row.currentProfit || 0)}</td>
                      <td style={{ fontWeight: 'bold', color: '#6366f1' }}>{formatBDT(row.futureProfit || 0)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{formatBDT(row.profit)}</td>
                      <td><span className={`list-badge ${row.status === 'completed' ? 'badge-success' : row.status === 'due' ? 'badge-danger' : 'badge-warning'}`}>{row.status === 'completed' ? 'সম্পন্ন' : row.status === 'due' ? 'বকেয়া' : 'চলতি'}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ padding: '2px 6px', minHeight: '28px' }} onClick={() => handleViewProjectDetails(row._id)}>
                          <Info size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0f9ff', fontWeight: 800, borderTop: '2px solid var(--primary)' }}>
                    <td colSpan={3} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.investmentAmount || 0), 0))}</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.returnAmount || 0), 0))}</td>
                    <td style={{ color: 'var(--success)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalPaid || 0), 0))}</td>
                    <td style={{ color: '#10b981', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.currentProfit || 0), 0))}</td>
                    <td style={{ color: '#6366f1', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.futureProfit || 0), 0))}</td>
                    <td style={{ color: 'var(--primary)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.profit || 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* ── Tab 7: Expenses ── */}
            {activeTab === 7 && (
              <table>
                <thead>
                  <tr>
                    <th>শিরোনাম</th><th>ক্যাটাগরি</th><th>তারিখ</th><th>পরিমাণ</th><th>রেকর্ডকারী</th><th>বিবরণ</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td style={{ fontWeight: 'bold' }}>{row.title}</td>
                      <td>{getCategoryLabel(row.category)}</td>
                      <td>{formatBanglaDate(row.date)}</td>
                      <td style={{ fontWeight: 'bold', color: '#e11d48' }}>-{formatBDT(row.amount)}</td>
                      <td>{row.recordedBy?.name || 'N/A'}</td>
                      <td>{row.description || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#fff1f2', fontWeight: 800, borderTop: '2px solid #e11d48' }}>
                    <td colSpan={3} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট খরচ</td>
                    <td style={{ color: '#e11d48', padding: '10px' }}>-{formatBDT(reportData.reduce((s, r) => s + (r.amount || 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ── Summary Panel below each table ── */}
          <div className="card" style={{ borderLeft: '5px solid var(--accent)', padding: '16px', marginTop: '12px' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '12px', fontWeight: 'bold' }}>
              মোট সারসংক্ষেপ
            </h4>

            {activeTab === 2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>নির্বাচিত সময়ে মোট সঞ্চয় জমা:</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>{formatBDT(reportData.reduce((s, r) => s + (r.amount || 0), 0))}</strong>
              </div>
            )}
            {activeTab === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                <StatBox label="মোট মাসিক কিস্তি" value={formatBDT(reportData.reduce((s, r) => s + (r.monthlyDepositAmount || 0), 0))} />
                <StatBox label="মোট জমাকৃত সঞ্চয়" value={formatBDT(reportData.reduce((s, r) => s + (r.totalDeposited || 0), 0))} color="var(--success)" />
                <StatBox label="মোট বকেয়া সঞ্চয়" value={formatBDT(reportData.reduce((s, r) => s + (r.totalDue || 0), 0))} color="var(--danger)" />
              </div>
            )}
            {activeTab === 4 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>নির্বাচিত সময়ে মোট কিস্তি আদায়:</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>{formatBDT(reportData.reduce((s, r) => s + (r.amount || 0), 0))}</strong>
              </div>
            )}
            {activeTab === 5 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <StatBox label="মোট বিনিয়োগ" value={formatBDT(reportData.reduce((s, r) => s + (r.investmentAmount || 0), 0))} />
                <StatBox label="মোট ফেরত লক্ষ্য" value={formatBDT(reportData.reduce((s, r) => s + (r.returnAmount || 0), 0))} />
                <StatBox label="মোট আদায়কৃত" value={formatBDT(reportData.reduce((s, r) => s + (r.totalPaid || 0), 0))} color="var(--success)" />
                <StatBox label="মোট অবশিষ্ট পাওনা" value={formatBDT(reportData.reduce((s, r) => s + (r.remainingBalance || 0), 0))} color="var(--accent)" />
                <StatBox label="মোট কিস্তি বকেয়া" value={formatBDT(reportData.reduce((s, r) => s + (r.totalDue || 0), 0))} color="var(--danger)" />
              </div>
            )}
            {activeTab === 6 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <StatBox label="মোট বিনিয়োগ" value={formatBDT(reportData.reduce((s, r) => s + (r.investmentAmount || 0), 0))} />
                <StatBox label="মোট ফেরত লক্ষ্য" value={formatBDT(reportData.reduce((s, r) => s + (r.returnAmount || 0), 0))} />
                <StatBox label="মোট আদায়কৃত" value={formatBDT(reportData.reduce((s, r) => s + (r.totalPaid || 0), 0))} color="var(--success)" />
                <StatBox label="অর্জিত মুনাফা" value={formatBDT(reportData.reduce((s, r) => s + (r.currentProfit || 0), 0))} color="#10b981" />
                <StatBox label="ভবিষ্যৎ মুনাফা" value={formatBDT(reportData.reduce((s, r) => s + (r.futureProfit || 0), 0))} color="#6366f1" />
                <StatBox label="মোট মুনাফা" value={formatBDT(reportData.reduce((s, r) => s + (r.profit || 0), 0))} color="var(--primary-dark)" />
              </div>
            )}
            {activeTab === 7 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>নির্বাচিত সময়ে মোট খরচ:</span>
                <strong style={{ fontSize: '1.2rem', color: '#e11d48' }}>-{formatBDT(reportData.reduce((s, r) => s + (r.amount || 0), 0))}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
            TAB 1 — সদস্য রিপোর্ট
        ═══════════════════════════════════════════════════════════ */}
      {activeTab === 1 && !loading && (
        <div>
          {/* Summary Hero Cards */}
          {memberSummaryData && (
            <div>
              {/* Row 1: Balance Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #0f766e, #115e59)', color: 'white', border: 'none', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>মোট জমাকৃত সঞ্চয়</span>
                  <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{formatBDT(memberSummaryData.totalDeposited)}</strong>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', border: 'none', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>মোট বকেয়া সঞ্চয়</span>
                  <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{formatBDT(memberSummaryData.totalMemberDue)}</strong>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #0369a1, #075985)', color: 'white', border: 'none', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>বর্তমান তহবিল ব্যালেন্স</span>
                  <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{formatBDT(memberSummaryData.currentBalance)}</strong>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px', display: 'block' }}>খরচ বাদে বর্তমান হিসাব</span>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>ভবিষ্যৎ সম্ভাব্য ব্যালেন্স</span>
                  <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{formatBDT(memberSummaryData.futureBalance)}</strong>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px', display: 'block' }}>সকল প্রজেক্ট সম্পন্ন হলে</span>
                </div>
              </div>

              {/* Explanation card */}
              <div className="card" style={{ padding: '14px', marginBottom: '14px', borderLeft: '4px solid var(--accent)', background: 'var(--bg-app)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-dark)', marginBottom: '10px', fontWeight: 700 }}>📋 হিসাবের বিস্তারিত</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>মোট সঞ্চয় জমা:</span>
                    <strong style={{ color: 'var(--success)' }}>{formatBDT(memberSummaryData.totalDeposited)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>মোট কিস্তি আদায়:</span>
                    <strong style={{ color: 'var(--success)' }}>{formatBDT(memberSummaryData.totalInstallmentsCollected)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>মোট বিনিয়োগ:</span>
                    <strong style={{ color: 'var(--accent)' }}>- {formatBDT(memberSummaryData.totalInvestments)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>মোট খরচ:</span>
                    <strong style={{ color: '#e11d48' }}>- {formatBDT(memberSummaryData.totalExpenses)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>প্রজেক্টের বাকি ফেরত:</span>
                    <strong style={{ color: 'var(--primary)' }}>+ {formatBDT(memberSummaryData.totalRemainingProjectReturn)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>সকল প্রজেক্টের টার্গেট:</span>
                    <strong style={{ color: 'var(--primary)' }}>{formatBDT(memberSummaryData.totalTargetReturn)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              মোট সদস্য: <strong>{toBanglaNumber(reportData.length)}</strong> জন
            </span>
            <button className="btn btn-outline btn-sm" style={{ width: 'auto', padding: '6px 10px', color: 'var(--success)', background: 'white' }} onClick={handleExportExcel}>
              <FileText size={14} color="#16a34a" /> <span>Excel</span>
            </button>
            <button className="btn btn-outline btn-sm" style={{ width: 'auto', padding: '6px 10px', color: 'var(--danger)', background: 'white' }} onClick={handleExportPDF}>
              <Download size={14} color="#dc2626" /> <span>PDF</span>
            </button>
          </div>

          {/* Member Table */}
          {reportData.length > 0 && (
            <div className="table-container">
              {/* Calculation legend */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 10px', background: 'var(--bg-app)', borderRadius: '8px', marginBottom: '8px', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--primary-dark)' }}>হিসাবের পদ্ধতি:</strong>
                &nbsp;প্রতিটি সদস্যের শেয়ার = <em>তার মোট জমা ÷ সকল সদস্যের মোট জমা</em>
                &nbsp;|&nbsp;
                <span style={{ color: '#7c3aed' }}>বর্তমান মুনাফা</span> = অর্জিত মুনাফা × শেয়ার %
                &nbsp;|&nbsp;
                <span style={{ color: '#ca8a04' }}>ভবিষ্যৎ মুনাফা</span> = প্রজেক্টের মোট সম্ভাব্য মুনাফা × শেয়ার %
                &nbsp;|&nbsp;
                <span style={{ color: '#0369a1' }}>বর্তমান ব্যালেন্স</span> = সমিতির বর্তমান তহবিল × শেয়ার %
                &nbsp;|&nbsp;
                <span style={{ color: '#15803d' }}>ভবিষ্যৎ ব্যালেন্স</span> = সমিতির ভবিষ্যৎ সম্ভাব্য তহবিল × শেয়ার %
              </div>
              <table>
                <thead>
                  <tr>
                    <th>সদস্য আইডি</th>
                    <th>সদস্য নাম</th>
                    <th>মাসিক কিস্তি</th>
                    <th>মোট জমাকৃত</th>
                    <th>শেয়ার %</th>
                    <th>মোট বকেয়া</th>
                    <th style={{ background: '#7c3aed', color: '#fff' }}>বর্তমান মুনাফা</th>
                    <th style={{ background: '#ca8a04', color: '#fff' }}>ভবিষ্যৎ মুনাফা</th>
                    <th style={{ background: '#0369a1', color: '#fff' }}>বর্তমান ব্যালেন্স</th>
                    <th style={{ background: '#15803d', color: '#fff' }}>ভবিষ্যৎ ব্যালেন্স</th>
                    <th>অবস্থা</th>
                    <th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row._id}>
                      <td>{toBanglaNumber(row.memberId)}</td>
                      <td style={{ fontWeight: 'bold' }}>{row.name}</td>
                      <td>{formatBDT(row.monthlyDepositAmount)}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatBDT(row.totalDeposited)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{toBanglaNumber(row.depositSharePercent || 0)}%</td>
                      <td style={{ fontWeight: 'bold', color: row.totalDue > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatBDT(row.totalDue)}</td>
                      <td style={{ fontWeight: 'bold', color: '#7c3aed', background: 'rgba(124,58,237,0.05)' }}>
                        {formatBDT(row.currentProfit || 0)}
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#ca8a04', background: 'rgba(202,138,4,0.05)' }}>
                        {formatBDT(row.futureProfit || 0)}
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#0369a1', background: 'rgba(3,105,161,0.05)' }}>
                        {formatBDT(row.currentBalance || 0)}
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#15803d', background: 'rgba(21,128,61,0.05)' }}>
                        {formatBDT(row.futureBalance || 0)}
                      </td>
                      <td><span className={`list-badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{row.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ padding: '2px 6px', minHeight: '28px' }} onClick={() => handleViewMemberDetails(row._id)}>
                          <Info size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdfa', fontWeight: 800, borderTop: '2px solid var(--primary)' }}>
                    <td colSpan={2} style={{ color: 'var(--primary-dark)', padding: '10px' }}>সর্বমোট ({toBanglaNumber(reportData.length)} জন)</td>
                    <td style={{ padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.monthlyDepositAmount || 0), 0))}</td>
                    <td style={{ color: 'var(--success)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalDeposited || 0), 0))}</td>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{toBanglaNumber(100)}%</td>
                    <td style={{ color: 'var(--danger)', padding: '10px' }}>{formatBDT(reportData.reduce((s, r) => s + (r.totalDue || 0), 0))}</td>
                    <td style={{ color: '#7c3aed', padding: '10px', background: 'rgba(124,58,237,0.08)', fontWeight: 800 }}>
                      {formatBDT(memberSummaryData ? memberSummaryData.currentProfitPool : reportData.reduce((s, r) => s + (r.currentProfit || 0), 0))}
                    </td>
                    <td style={{ color: '#ca8a04', padding: '10px', background: 'rgba(202,138,4,0.08)', fontWeight: 800 }}>
                      {formatBDT(memberSummaryData ? memberSummaryData.futureProfitPool : reportData.reduce((s, r) => s + (r.futureProfit || 0), 0))}
                    </td>
                    <td style={{ color: '#0369a1', padding: '10px', background: 'rgba(3,105,161,0.08)', fontWeight: 800 }}>
                      {formatBDT(memberSummaryData ? memberSummaryData.currentBalance : reportData.reduce((s, r) => s + (r.currentBalance || 0), 0))}
                    </td>
                    <td style={{ color: '#15803d', padding: '10px', background: 'rgba(21,128,61,0.08)', fontWeight: 800 }}>
                      {formatBDT(memberSummaryData ? memberSummaryData.futureBalance : reportData.reduce((s, r) => s + (r.futureBalance || 0), 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Member Detail Modal ───────────────────────────────── */}
      {activeMemberDetail && (
        <div className="modal-overlay" onClick={() => setActiveMemberDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>সদস্য বিস্তারিত বিবরণী</h3>
              <button className="modal-close" onClick={() => setActiveMemberDetail(null)}><X size={24} /></button>
            </div>
            <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '12px' }}>
              <h4 style={{ marginBottom: '8px' }}>{activeMemberDetail.member.name}</h4>
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <tbody>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>সদস্য আইডি:</td><td style={{ fontWeight: 'bold' }}>{toBanglaNumber(activeMemberDetail.member.memberId)}</td></tr>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>মোবাইল নম্বর:</td><td>{toBanglaNumber(activeMemberDetail.member.mobile)}</td></tr>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>যোগদানের তারিখ:</td><td>{formatBanglaDate(activeMemberDetail.member.joiningDate)}</td></tr>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>মাসিক সঞ্চয় হার:</td><td style={{ fontWeight: 'bold' }}>{formatBDT(activeMemberDetail.member.monthlyDepositAmount)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="kpi-card success" style={{ padding: '8px' }}>
                <span className="kpi-title" style={{ fontSize: '0.75rem' }}>মোট সঞ্চয়</span>
                <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeMemberDetail.calculations.totalDeposited)}</span>
              </div>
              <div className="kpi-card danger" style={{ padding: '8px' }}>
                <span className="kpi-title" style={{ fontSize: '0.75rem' }}>মোট বকেয়া</span>
                <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeMemberDetail.calculations.totalDue)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Project Detail Modal ──────────────────────────────── */}
      {activeProjectDetail && (
        <div className="modal-overlay" onClick={() => setActiveProjectDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>বিনিয়োগ বিস্তারিত বিবরণী</h3>
              <button className="modal-close" onClick={() => setActiveProjectDetail(null)}><X size={24} /></button>
            </div>
            <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '12px' }}>
              <h4 style={{ marginBottom: '8px' }}>{activeProjectDetail.project.projectName}</h4>
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <tbody>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>চালকের নাম:</td><td style={{ fontWeight: 'bold' }}>{activeProjectDetail.project.driverName}</td></tr>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>যোগাযোগ:</td><td>{toBanglaNumber(activeProjectDetail.project.driverMobile)}</td></tr>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>মূলধন বিনিয়োগ:</td><td style={{ fontWeight: 'bold' }}>{formatBDT(activeProjectDetail.project.investmentAmount)}</td></tr>
                  <tr><td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>ফেরত লক্ষ্যমাত্রা:</td><td style={{ fontWeight: 'bold' }}>{formatBDT(activeProjectDetail.project.returnAmount)}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="kpi-card success" style={{ padding: '8px' }}>
                <span className="kpi-title" style={{ fontSize: '0.75rem' }}>আদায়কৃত</span>
                <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeProjectDetail.calculations.totalPaid)}</span>
              </div>
              <div className="kpi-card danger" style={{ padding: '8px' }}>
                <span className="kpi-title" style={{ fontSize: '0.75rem' }}>বকেয়া</span>
                <span className="kpi-value" style={{ fontSize: '1rem' }}>{formatBDT(activeProjectDetail.calculations.totalDue)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>

    <BottomNav />
  </div>
);
}