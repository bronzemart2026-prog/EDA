import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { formatBDT, toBanglaNumber } from './bangla';

const banglaToEnglishNumerals = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function parseBanglaFormattedNumber(val) {
  if (val === null || val === undefined) return 0;
  const str = String(val);
  let englishStr = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    englishStr += banglaToEnglishNumerals[char] || char;
  }
  const cleanedStr = englishStr.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanedStr);
  return isNaN(parsed) ? 0 : parsed;
}

function isColumnSummable(col) {
  if (!col || !col.header) return false;
  const keywords = [
    'বিনিয়োগ', 'আদায়', 'বকেয়া', 'সঞ্চয়', 'পরিমাণ', 'জমাকৃত',
    'পাওনা', 'মুনাফা', 'লক্ষ্য', 'টাকা', '৳',
    'amount', 'paid', 'due', 'deposited', 'investment', 'return', 'profit', 'expense', 'fee', 'charge', 'কিস্তি'
  ];
  const excludeKeywords = ['আইডি', 'তারিখ', 'মোবাইল', 'মেয়াদ', 'duration', 'date', 'mobile', 'id', 'status', 'অবস্থা', 'মাসিক', 'বিবরণ', 'label', 'সংখ্যা', 'সারসংক্ষেপ', 'শেয়ার', '%', 'শতাংশ', 'percent', 'rate'];
  const headerLower = col.header.toLowerCase();
  if (excludeKeywords.some(ex => headerLower.includes(ex.toLowerCase()))) return false;
  return keywords.some(kw => headerLower.includes(kw.toLowerCase()));
}

/**
 * Export data to Excel (.xlsx)
 */
export function exportToExcel(data, columns, filename = 'export', sheetName = 'Sheet1') {
  const headers = columns.map(c => c.header);
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.key.split('.').reduce((o, k) => (o ? o[k] : ''), row);
      return val ?? '';
    })
  );
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF using html2pdf.js
 * Features:
 *  - Page-break-inside: avoid on all rows
 *  - Beautiful tfoot totals row (optional)
 *  - Summary dashboard below table
 *  - Optional memberSummary for Tab 7 member report
 */
export function exportToPDF(data, columns, title = 'রিপোর্ট', filename = 'export', memberSummary = null, options = {}) {
  const { hideTotals = false } = options;
  const element = document.createElement('div');

  const currentDate = new Date().toLocaleString('bn-BD', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Build tfoot totals
  const tfootCells = hideTotals ? '' : columns.map((c, colIdx) => {
    if (isColumnSummable(c)) {
      const total = data.reduce((sum, row) => {
        const val = c.key.split('.').reduce((o, k) => (o ? o[k] : ''), row);
        return sum + parseBanglaFormattedNumber(val);
      }, 0);
      return `<td style="padding:8px 10px;border:1px solid #94a3b8;color:#1d4ed8;font-weight:800;white-space:nowrap;background:#e0f2fe;">${formatBDT(total)}</td>`;
    } else {
      return `<td style="padding:8px 10px;border:1px solid #cbd5e1;color:#334155;background:#f8fafc;">${colIdx === 0 ? '<strong>সর্বমোট</strong>' : ''}</td>`;
    }
  }).join('');

  // Build summary cards
  const summableCols = hideTotals ? [] : columns.filter(c => isColumnSummable(c));
  const summaryCardsHTML = summableCols.length > 0 ? `
    <div style="margin-top:24px;padding:16px 18px;background:#f0f9ff;border:1.5px solid #bae6fd;border-left:5px solid #1d4ed8;border-radius:10px;page-break-inside:avoid;">
      <h3 style="font-size:13px;color:#1e3a8a;font-weight:700;margin:0 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">
        📊 রিপোর্ট সারসংক্ষেপ
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${summableCols.map(c => {
    const total = data.reduce((sum, row) => {
      const val = c.key.split('.').reduce((o, k) => (o ? o[k] : ''), row);
      return sum + parseBanglaFormattedNumber(val);
    }, 0);
    return `
            <div style="flex:1;min-width:130px;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              <span style="font-size:10px;color:#64748b;display:block;margin-bottom:3px;font-weight:600;">মোট ${c.header}</span>
              <span style="font-size:15px;color:#1d4ed8;font-weight:800;">${formatBDT(total)}</span>
            </div>`;
  }).join('')}
      </div>
    </div>` : '';

  // Optional member summary section (Tab 7)
  const memberSummaryHTML = memberSummary ? `
    <div style="margin-top:20px;padding:14px 16px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-left:5px solid #16a34a;border-radius:10px;page-break-inside:avoid;">
      <h3 style="font-size:13px;color:#15803d;font-weight:700;margin:0 0 12px 0;padding-bottom:8px;border-bottom:1px solid #d1fae5;">
        💰 সমিতির আর্থিক অবস্থা
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <div style="flex:1;min-width:130px;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:3px;font-weight:600;">বর্তমান তহবিল ব্যালেন্স</span>
          <span style="font-size:14px;color:#1d4ed8;font-weight:800;">${formatBDT(memberSummary.currentBalance)}</span>
          <span style="font-size:9px;color:#94a3b8;display:block;margin-top:2px;">খরচ বাদে বর্তমান হিসাব</span>
        </div>
        <div style="flex:1;min-width:130px;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:3px;font-weight:600;">ভবিষ্যৎ সম্ভাব্য ব্যালেন্স</span>
          <span style="font-size:14px;color:#16a34a;font-weight:800;">${formatBDT(memberSummary.futureBalance)}</span>
          <span style="font-size:9px;color:#94a3b8;display:block;margin-top:2px;">সকল প্রজেক্ট সম্পন্ন হলে</span>
        </div>
        <div style="flex:1;min-width:130px;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:3px;font-weight:600;">মোট বকেয়া সঞ্চয়</span>
          <span style="font-size:14px;color:#dc2626;font-weight:800;">${formatBDT(memberSummary.totalMemberDue)}</span>
        </div>
        <div style="flex:1;min-width:130px;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:3px;font-weight:600;">প্রজেক্টের বাকি ফেরত</span>
          <span style="font-size:14px;color:#0369a1;font-weight:800;">${formatBDT(memberSummary.totalRemainingProjectReturn)}</span>
        </div>
      </div>
    </div>` : '';

  const isLandscape = columns.length > 6;

  element.innerHTML = `
    <div style="font-family:'Hind Siliguri',-apple-system,BlinkMacSystemFont,sans-serif;padding:20px 24px;color:#1e293b;background:#fff;">

      <!-- Premium Designed Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:3px double #047857;padding-bottom:16px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${window.location.origin}/main_logo.png" style="width:48px;height:48px;border-radius:12px;box-shadow:0 3px 6px rgba(0,0,0,0.15);object-fit:contain;background:#fff;padding:2px;" />
          <div>
            <h1 style="font-size:20px;color:#064e3b;font-weight:800;margin:0;letter-spacing:0.5px;">Entrepreneur Development Association (EDA)</h1>
            <p style="font-size:9px;color:#047857;margin:2px 0 0 0;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">ENTREPRENEUR DEVELOPMENT ASSOCIATION</p>
          </div>
        </div>
        <div>
          <span style="font-size:12px;color:#fff;font-weight:700;background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #0284c7 100%);padding:6px 16px;border-radius:30px;box-shadow:0 2px 6px rgba(4,120,87,0.2);letter-spacing:0.5px;display:inline-block;white-space:nowrap;">
            ${title}
          </span>
        </div>
      </div>

      <!-- Styled Metadata Information Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 14px;font-size:10px;color:#475569;margin-bottom:16px;page-break-inside:avoid;">
        <span>💻 <strong>সিস্টেম:</strong> সমিতি ব্যবস্থাপনা</span>
        <span>📅 <strong>রিপোর্ট তৈরি:</strong> ${currentDate}</span>
        <span>📊 <strong>মোট রেকর্ড:</strong> ${toBanglaNumber(data.length)} টি</span>
      </div>

      <!-- Table -->
      <table style="width:100%;border-collapse:collapse;font-size:${isLandscape ? '9px' : '11px'};table-layout:fixed;">
        <thead>
          <tr>
            ${columns.map(c => `<th style="background:#047857;color:#fff;font-weight:700;padding:9px 8px;border:1px solid #047857;text-align:left;word-wrap:break-word;">${c.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, idx) => `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};page-break-inside:avoid;">
              ${columns.map(c => {
    const val = c.key.split('.').reduce((o, k) => (o ? o[k] : ''), row);
    return `<td style="padding:7px 8px;border:1px solid #e2e8f0;color:#334155;word-wrap:break-word;vertical-align:top;">${val ?? ''}</td>`;
  }).join('')}
            </tr>`).join('')}
        </tbody>
        ${hideTotals ? '' : `<tfoot>
          <tr style="background:#f8fafc;border-top:2.5px solid #047857;border-bottom:2px solid #047857;page-break-inside:avoid;">
            ${tfootCells}
          </tr>
        </tfoot>`}
      </table>

      ${summaryCardsHTML}
      ${memberSummaryHTML}

      <!-- Beautiful Styled Footer -->
      <div style="margin-top:40px;text-align:center;font-size:10px;color:#475569;border-top:1px solid #cbd5e1;padding-top:12px;page-break-inside:avoid;line-height:1.6;">
        <div style="font-weight:700;">© ${new Date().getFullYear()} Entrepreneur Development Association (EDA) | সর্বস্বত্ব সংরক্ষিত।</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">
          Developed by: <span style="font-weight:bold;color:#047857;">Md Arif Uddin</span> | 
          <a href="https://wa.me/8801825334505" target="_blank" rel="noopener noreferrer" style="color:#047857;text-decoration:none;font-weight:700;margin-left:2px;">01825334505 (WhatsApp)</a>
        </div>
      </div>
    </div>
  `;

  const exportDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const opt = {
    margin: [8, 8, 8, 8],
    filename: `${filename} (${exportDate}).pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: columns.length > 6 ? 'landscape' : 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save();
}

/**
 * Dedicated Overall Samiti Summary PDF Export (Tab 0)
 * Completely eliminates the bogus column summation issue and presents
 * an executive-grade financial statement matching the on-screen dashboard.
 */
export function exportOverallSummaryPDF(summaryData) {
  if (!summaryData) return;

  const currentBalance = (summaryData.totalDeposits || 0) + (summaryData.totalInstallmentsCollected || 0) - (summaryData.totalInvestments || 0) - (summaryData.totalExpenses || 0);
  const totalIncome = (summaryData.totalDeposits || 0) + (summaryData.totalInstallmentsCollected || 0);
  const realizedProfit = summaryData.totalRealizedProfit || 0;

  const currentDate = new Date().toLocaleString('bn-BD', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family:'Hind Siliguri',-apple-system,BlinkMacSystemFont,sans-serif;padding:24px 26px;color:#1e293b;background:#fff;max-width:800px;margin:0 auto;">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:3px double #047857;padding-bottom:16px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${window.location.origin}/main_logo.png" style="width:48px;height:48px;border-radius:12px;box-shadow:0 3px 6px rgba(0,0,0,0.15);object-fit:contain;background:#fff;padding:2px;" />
          <div>
            <h1 style="font-size:20px;color:#064e3b;font-weight:800;margin:0;letter-spacing:0.5px;">Entrepreneur Development Association (EDA)</h1>
            <p style="font-size:9px;color:#047857;margin:2px 0 0 0;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">ENTREPRENEUR DEVELOPMENT ASSOCIATION</p>
          </div>
        </div>
        <div>
          <span style="font-size:12px;color:#fff;font-weight:700;background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #0284c7 100%);padding:6px 16px;border-radius:30px;box-shadow:0 2px 6px rgba(4,120,87,0.2);letter-spacing:0.5px;display:inline-block;white-space:nowrap;">
            সমিতি সার্বিক রিপোর্ট
          </span>
        </div>
      </div>

      <!-- Metadata Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 14px;font-size:10px;color:#475569;margin-bottom:16px;page-break-inside:avoid;">
        <span>💻 <strong>সিস্টেম:</strong> সমিতি ব্যবস্থাপনা</span>
        <span>📅 <strong>রিপোর্ট তৈরি:</strong> ${currentDate}</span>
        <span>👥 <strong>মোট সদস্য:</strong> ${toBanglaNumber(summaryData.totalMembers)} জন | 🚀 <strong>সক্রিয় প্রজেক্ট:</strong> ${toBanglaNumber(summaryData.activeProjects)} টি</span>
      </div>

      <!-- Top KPI Balance Cards -->
      <div style="display:flex;gap:12px;margin-bottom:16px;page-break-inside:avoid;">
        <div style="flex:1;background:linear-gradient(135deg, #0f766e 0%, #115e59 100%);color:#fff;padding:16px 18px;border-radius:12px;box-shadow:0 3px 8px rgba(15,118,110,0.25);">
          <span style="font-size:11px;color:rgba(255,255,255,0.85);font-weight:600;display:block;margin-bottom:3px;">সমিতির বর্তমান তহবিল ব্যালেন্স (নগদ স্থিতি)</span>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:0.3px;">${formatBDT(currentBalance)}</div>
          <span style="font-size:10px;color:#fde047;font-weight:700;display:block;margin-top:4px;">সর্বমোট বকেয়া: ${formatBDT(summaryData.totalDueAmount)}</span>
        </div>
        <div style="flex:1;background:linear-gradient(135deg, #16a34a 0%, #15803d 100%);color:#fff;padding:16px 18px;border-radius:12px;box-shadow:0 3px 8px rgba(22,163,74,0.25);">
          <span style="font-size:11px;color:rgba(255,255,255,0.85);font-weight:600;display:block;margin-bottom:3px;">প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</span>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:0.3px;">${formatBDT(summaryData.totalProfit)}</div>
          <span style="font-size:10px;color:#bbf7d0;font-weight:700;display:block;margin-top:4px;">এ পর্যন্ত আদায়কৃত মুনাফা: ${formatBDT(realizedProfit)}</span>
        </div>
      </div>

      <!-- 4 Quick Stats Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px;page-break-inside:avoid;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:2px;font-weight:600;">মোট সঞ্চয় জমা</span>
          <span style="font-size:13px;color:#16a34a;font-weight:800;">${formatBDT(summaryData.totalDeposits)}</span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:2px;font-weight:600;">মোট কিস্তি আদায়</span>
          <span style="font-size:13px;color:#16a34a;font-weight:800;">${formatBDT(summaryData.totalInstallmentsCollected)}</span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:2px;font-weight:600;">মোট বিনিয়োগ</span>
          <span style="font-size:13px;color:#d97706;font-weight:800;">${formatBDT(summaryData.totalInvestments)}</span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#64748b;display:block;margin-bottom:2px;font-weight:600;">মোট খরচ (ব্যয়)</span>
          <span style="font-size:13px;color:#dc2626;font-weight:800;">${formatBDT(summaryData.totalExpenses || 0)}</span>
        </div>
      </div>

      <!-- Dues Highlight Strip -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;page-break-inside:avoid;">
        <div style="background:#fef2f2;border:1px solid #fecaca;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#991b1b;display:block;margin-bottom:2px;font-weight:600;">সদস্য সঞ্চয় বকেয়া</span>
          <span style="font-size:13px;color:#dc2626;font-weight:800;">${formatBDT(summaryData.memberDueAmount)}</span>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#991b1b;display:block;margin-bottom:2px;font-weight:600;">প্রজেক্ট কিস্তি বকেয়া</span>
          <span style="font-size:13px;color:#dc2626;font-weight:800;">${formatBDT(summaryData.projectDueAmount)}</span>
        </div>
        <div style="background:#fff1f2;border:1.5px solid #f43f5e;padding:10px 12px;border-radius:8px;">
          <span style="font-size:10px;color:#9f1239;display:block;margin-bottom:2px;font-weight:700;">সর্বমোট আদায়যোগ্য বকেয়া</span>
          <span style="font-size:13px;color:#e11d48;font-weight:800;">${formatBDT(summaryData.totalDueAmount)}</span>
        </div>
      </div>

      <!-- Detailed Statement Table -->
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;color:#064e3b;font-weight:700;margin:0 0 8px 0;border-left:4px solid #059669;padding-left:8px;">
          📊 বিস্তারিত আর্থিক বিবরণী (Financial Summary)
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr>
              <th style="background:#047857;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #047857;text-align:left;width:20%;">বিভাগ</th>
              <th style="background:#047857;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #047857;text-align:left;width:55%;">বিবরণ</th>
              <th style="background:#047857;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #047857;text-align:right;width:25%;">পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#16a34a;">আয়</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">মোট সঞ্চয় জমা (সদস্যদের কাছ থেকে)</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#16a34a;">+ ${formatBDT(summaryData.totalDeposits)}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#16a34a;">আয়</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">মোট কিস্তি আদায় (প্রজেক্ট থেকে)</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#16a34a;">+ ${formatBDT(summaryData.totalInstallmentsCollected)}</td>
            </tr>
            <tr style="background:#f0fdf4;border-top:1.5px solid #86efac;border-bottom:1.5px solid #86efac;">
              <td style="padding:8px 10px;border:1px solid #86efac;font-weight:800;color:#15803d;">মোট আয় (প্রাপ্তি)</td>
              <td style="padding:8px 10px;border:1px solid #86efac;font-weight:700;color:#15803d;">সমস্ত উৎস থেকে মোট প্রাপ্তি</td>
              <td style="padding:8px 10px;border:1px solid #86efac;text-align:right;font-weight:800;color:#15803d;">${formatBDT(totalIncome)}</td>
            </tr>
            <tr>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#d97706;">বিনিয়োগ</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">মোট প্রজেক্টে বিনিয়োগ</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#d97706;">- ${formatBDT(summaryData.totalInvestments)}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#dc2626;">ব্যয়</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">মোট খরচ / পরিচালনা ব্যয়</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#dc2626;">- ${formatBDT(summaryData.totalExpenses || 0)}</td>
            </tr>
            <tr style="background:#f0fdfa;border-top:2px solid #0f766e;border-bottom:2px solid #0f766e;">
              <td style="padding:9px 10px;border:1px solid #0f766e;font-weight:800;color:#0f766e;font-size:12px;">নিট ব্যালেন্স</td>
              <td style="padding:9px 10px;border:1px solid #0f766e;font-weight:700;color:#0f766e;">বর্তমান তহবিল ব্যালেন্স (প্রাপ্তি - বিনিয়োগ - ব্যয়)</td>
              <td style="padding:9px 10px;border:1px solid #0f766e;text-align:right;font-weight:800;color:#0f766e;font-size:13px;">${formatBDT(currentBalance)}</td>
            </tr>
            <tr>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#dc2626;">বকেয়া</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">সদস্য সঞ্চয় বকেয়া</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#dc2626;">${formatBDT(summaryData.memberDueAmount)}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#dc2626;">বকেয়া</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">প্রজেক্ট কিস্তি বকেয়া</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#dc2626;">${formatBDT(summaryData.projectDueAmount)}</td>
            </tr>
            <tr style="background:#fef2f2;border-top:1.5px solid #fca5a5;border-bottom:1.5px solid #fca5a5;">
              <td style="padding:8px 10px;border:1px solid #fca5a5;font-weight:800;color:#b91c1c;">মোট বকেয়া</td>
              <td style="padding:8px 10px;border:1px solid #fca5a5;font-weight:700;color:#b91c1c;">সর্বমোট আদায়যোগ্য বকেয়া (সদস্য + প্রজেক্ট)</td>
              <td style="padding:8px 10px;border:1px solid #fca5a5;text-align:right;font-weight:800;color:#b91c1c;">${formatBDT(summaryData.totalDueAmount)}</td>
            </tr>
            <tr>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#0284c7;">মুনাফা</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0284c7;">${formatBDT(summaryData.totalProfit)}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:#16a34a;">মুনাফা</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;color:#334155;">এ পর্যন্ত আদায়কৃত মোট মুনাফা</td>
              <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#16a34a;">${formatBDT(realizedProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="margin-top:24px;text-align:center;font-size:10px;color:#475569;border-top:1px solid #cbd5e1;padding-top:12px;page-break-inside:avoid;line-height:1.6;">
        <div style="font-weight:700;">© ${new Date().getFullYear()} Entrepreneur Development Association (EDA) | সর্বস্বত্ব সংরক্ষিত।</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">
          Developed by: <span style="font-weight:bold;color:#047857;">Md Arif Uddin</span> | 
          <a href="https://wa.me/8801825334505" target="_blank" rel="noopener noreferrer" style="color:#047857;text-decoration:none;font-weight:700;margin-left:2px;">01825334505 (WhatsApp)</a>
        </div>
      </div>
    </div>
  `;

  const exportDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const opt = {
    margin: [8, 8, 8, 8],
    filename: `Samiti_Overall_Report (${exportDate}).pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save();
}
