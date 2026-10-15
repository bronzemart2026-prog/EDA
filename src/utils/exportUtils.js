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
  const excludeKeywords = ['আইডি', 'তারিখ', 'মোবাইল', 'মেয়াদ', 'duration', 'date', 'mobile', 'id', 'status', 'অবস্থা', 'মাসিক'];
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
 *  - Beautiful tfoot totals row
 *  - Summary dashboard below table
 *  - Optional memberSummary for Tab 7 member report
 */
export function exportToPDF(data, columns, title = 'রিপোর্ট', filename = 'export', memberSummary = null) {
  const element = document.createElement('div');

  const currentDate = new Date().toLocaleString('bn-BD', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Build tfoot totals
  const tfootCells = columns.map((c, colIdx) => {
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
  const summableCols = columns.filter(c => isColumnSummable(c));
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:3px double #1d4ed8;padding-bottom:16px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${window.location.origin}/main_logo.png" style="width:46px;height:46px;border-radius:12px;box-shadow:0 3px 6px rgba(0,0,0,0.15);object-fit:cover;" />
          <div>
            <h1 style="font-size:22px;color:#1e3a8a;font-weight:800;margin:0;letter-spacing:0.5px;">স্বপ্নের বাতিঘর </h1>
            <p style="font-size:9px;color:#64748b;margin:2px 0 0 0;font-weight:500;text-transform:uppercase;letter-spacing:0.8px;">SOPNER BATHIGHOR</p>
          </div>
        </div>
        <div>
          <span style="font-size:12px;color:#fff;font-weight:700;background:#1d4ed8;padding:6px 16px;border-radius:30px;box-shadow:0 2px 4px rgba(29,78,216,0.15);letter-spacing:0.5px;display:inline-block;white-space:nowrap;">
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
            ${columns.map(c => `<th style="background:#1d4ed8;color:#fff;font-weight:700;padding:9px 8px;border:1px solid #1d4ed8;text-align:left;word-wrap:break-word;">${c.header}</th>`).join('')}
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
        <tfoot>
          <tr style="background:#f8fafc;border-top:2.5px solid #1d4ed8;border-bottom:2px solid #1d4ed8;page-break-inside:avoid;">
            ${tfootCells}
          </tr>
        </tfoot>
      </table>

      ${summaryCardsHTML}
      ${memberSummaryHTML}

      <!-- Beautiful Styled Footer -->
      <div style="margin-top:40px;text-align:center;font-size:10px;color:#475569;border-top:1px solid #cbd5e1;padding-top:12px;page-break-inside:avoid;line-height:1.6;">
        <div style="font-weight:700;">© ${new Date().getFullYear()} স্বপ্নের বাতিঘর  | সর্বস্বত্ব সংরক্ষিত।</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">
          Developed by: <span style="font-weight:bold;color:#1d4ed8;">Md Arif Uddin</span> | 
          <a href="https://wa.me/8801825334505" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:none;font-weight:700;margin-left:2px;">01825334505 (WhatsApp)</a>
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
