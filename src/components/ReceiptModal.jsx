import React, { useRef, useState } from 'react';
import { X, Download, MessageCircle, Phone, CheckCircle, ShieldCheck, Printer, Copy, Check } from 'lucide-react';
import { toBanglaNumber, formatBanglaMonth, formatBanglaDate, numberToBanglaWords } from '../utils/bangla';

/**
 * ReceiptModal - Professional, human-designed financial payment receipt
 * Replaces generic AI tropes (zigzags, consumer emojis, developer ads)
 * with an authentic, bank-grade money receipt (টাকা প্রাপ্তি রসিদ).
 */
export default function ReceiptModal({ receipt, onClose }) {
  const receiptRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  if (!receipt) return null;

  const isDeposit = receipt.type === 'deposit';

  // Persistent, unique receipt identifier
  const uniqueIdPart = receipt.id ? String(receipt.id).slice(-8).toUpperCase() : Date.now().toString().slice(-8);
  const receiptNumber = `EDA-RCP-${uniqueIdPart}`;

  // Bengali formatted dates & times
  const currentDate = new Date();
  const printDateStr = formatBanglaDate(currentDate);
  const printTimeStr = currentDate.toLocaleTimeString('bn-BD', {
    hour: '2-digit', minute: '2-digit'
  });

  // Transaction Date
  let transactionDateFormatted = printDateStr;
  if (receipt.date) {
    if (typeof receipt.date === 'string' && /[ঁ-৯]/.test(receipt.date)) {
      transactionDateFormatted = receipt.date;
    } else {
      transactionDateFormatted = formatBanglaDate(receipt.date) || printDateStr;
    }
  }

  // Month Formatted
  const formattedMonth = receipt.month && receipt.month.includes('-')
    ? formatBanglaMonth(receipt.month)
    : (receipt.month || '');

  // Amount
  let rawAmount = Number(receipt.amountRaw);
  if (isNaN(rawAmount) || rawAmount === 0) {
    if (typeof receipt.amount === 'number') {
      rawAmount = receipt.amount;
    } else if (typeof receipt.amount === 'string') {
      const bengaliToEnglish = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
      };
      const cleaned = receipt.amount
        .split('')
        .map(c => bengaliToEnglish[c] !== undefined ? bengaliToEnglish[c] : c)
        .join('')
        .replace(/[^0-9.]/g, '');
      rawAmount = Number(cleaned) || 0;
    } else {
      rawAmount = 0;
    }
  }
  const banglaAmountFormatted = toBanglaNumber(rawAmount.toLocaleString('en-US'));
  const banglaAmountWords = numberToBanglaWords(rawAmount);

  // Phone for WhatsApp
  const defaultPhone = isDeposit ? receipt.mobile : receipt.driverMobile;
  const [customNumber, setCustomNumber] = useState(defaultPhone || '');

  // Copy Receipt Number
  const handleCopyReceiptNo = () => {
    navigator.clipboard.writeText(receiptNumber);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  // Build clean, polite WhatsApp text
  const buildWhatsAppText = () => {
    const orgName = 'Entrepreneur Development Association (EDA)';
    const lines = [
      `🏦 *${orgName}*`,
      `*টাকা প্রাপ্তির মানি রসিদ (Money Receipt)*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 *রসিদ নম্বর:* ${receiptNumber}`,
      `📆 *তারিখ:* ${transactionDateFormatted}`,
      ``,
      isDeposit
        ? `👤 *সদস্যের নাম:* ${receipt.memberName}\n🆔 *সদস্য আইডি:* ${receipt.memberId}\n📱 *মোবাইল:* ${receipt.mobile || 'প্রযোজ্য নয়'}`
        : `🚗 *প্রজেক্ট:* ${receipt.projectName}\n👷 *চালক:* ${receipt.driverName}\n📱 *মোবাইল:* ${receipt.driverMobile || 'প্রযোজ্য নয়'}`,
      ``,
      `📌 *খাত / বিবরণ:* ${receipt.depositHead || (isDeposit ? 'মাসিক সঞ্চয় জমা' : 'প্রজেক্ট মাসিক কিস্তি আদায়')}`,
      formattedMonth && formattedMonth.includes('-') ? `📅 *সংশ্লিষ্ট মাস:* ${formattedMonth}` : null,
      `💰 *জমাকৃত পরিমাণ:* ৳ ${banglaAmountFormatted}`,
      `✍️ *কথায়:* ${banglaAmountWords}`,
      `✅ *স্ট্যাটাস:* সফলভাবে গ্রহণ ও সংরক্ষিত হয়েছে (PAID)`,
      ``,
      `🏢 *EDA অফিসিয়াল রেকর্ড দ্বারা অনুমোদিত*`,
      `ধন্যবাদ! আপনার সঞ্চয়ই আপনার উজ্জ্বল ভবিষ্যৎ।`,
    ].filter(Boolean);
    return lines.join('\n');
  };

  // High-Resolution 3x Canvas Generation
  const generateCanvas = async () => {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(receiptRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
    });
  };

  const getWhatsAppLink = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const intl = cleaned.startsWith('0') ? '880' + cleaned.slice(1) : cleaned;
    const text = buildWhatsAppText();
    return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const targetName = isDeposit ? (receipt.memberName || 'member') : (receipt.driverName || 'project');
      link.download = `EDA_Receipt_${receiptNumber}_${targetName.replace(/\s+/g, '_')}.png`;
      link.click();
    } catch (err) {
      console.error('Image generation failed:', err);
      alert('রসিদ ডাউনলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 350,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '96vh',
          padding: '16px',
          borderRadius: '20px',
          background: 'var(--bg-card, #ffffff)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Modal Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#064e3b', fontWeight: 800 }}>
              {isDeposit ? 'সঞ্চয় জমার অফিসিয়াল মানি রসিদ' : 'কিস্তি আদায়ের অফিসিয়াল মানি রসিদ'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              অফিসিয়াল ও গ্রাহক কপি (Money Receipt Voucher)
            </span>
          </div>
          <button
            onClick={onClose}
            className="modal-close"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ACTUAL PAYMENT SLIP / MONEY RECEIPT TO RENDER & EXPORT                   */}
        {/* ========================================================================= */}
        <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: '6px' }}>
          <div
            ref={receiptRef}
            id="eda-official-receipt-render"
            style={{
              width: '500px',
              minWidth: '500px',
              backgroundColor: '#ffffff',
              position: 'relative',
              borderRadius: '16px',
              border: '2px solid #064e3b',
              boxShadow: '0 12px 32px rgba(6, 78, 59, 0.12)',
              fontFamily: "'Hind Siliguri', sans-serif",
              padding: '18px 20px 16px 20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Subtle Inner Security Border Frame */}
            <div
              style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                right: '5px',
                bottom: '5px',
                border: '1px solid #d1fae5',
                borderRadius: '12px',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Delicate EDA Watermark in Center */}
            <div
              style={{
                position: 'absolute',
                top: '52%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '180px',
                height: '180px',
                opacity: 0.045,
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              <img
                src="/main_logo.png"
                alt="Watermark"
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* --- HEADER: OFFICIAL LETTERHEAD --- */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #064e3b', paddingBottom: '12px' }}>
              {/* EDA Emblem */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px',
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0
                }}
              >
                <img
                  src="/main_logo.png"
                  alt="EDA Logo"
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Organization Formal Titles */}
              <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 800,
                    color: '#064e3b',
                    letterSpacing: '-0.2px',
                    lineHeight: 1.2
                  }}
                >
                  Entrepreneur Development Association
                </h1>
                <h2
                  style={{
                    margin: '2px 0 0 0',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#047857',
                    lineHeight: 1.2
                  }}
                >
                  এন্টারপ্রেনার ডেভেলপমেন্ট অ্যাসোসিয়েশন (ইডিএ)
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  কর্মই মূলধন, বিনিয়োগে-ই উন্নয়ন • চট্টগ্রাম, বাংলাদেশ
                </div>
              </div>

              {/* Copy Badge */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #047857',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#ecfdf5',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#047857', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  মূল কপি
                </span>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#064e3b' }}>
                  ORIGINAL
                </span>
              </div>
            </div>

            {/* --- RECEIPT TITLE RIBBON --- */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', marginTop: '-12px', marginBottom: '12px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                  color: '#ffffff',
                  padding: '4px 22px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  boxShadow: '0 3px 8px rgba(6, 78, 59, 0.25)',
                  border: '1.5px solid #f59e0b'
                }}
              >
                {isDeposit ? 'টাকা প্রাপ্তির মানি রসিদ (MONEY RECEIPT)' : 'কিস্তি পরিশোধের মানি রসিদ (INSTALLMENT RECEIPT)'}
              </div>
            </div>

            {/* --- META STRIP (RECEIPT NO, DATES) --- */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '8px 12px',
                marginBottom: '12px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>রসিদ নং / Receipt No: </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#064e3b', letterSpacing: '0.5px' }}>
                  {receiptNumber}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>তারিখ: </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  {transactionDateFormatted}
                </span>
              </div>
            </div>

            {/* --- PARTICULARS / VOUCHER TABLE --- */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {isDeposit ? (
                    <>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', width: '38%', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          সদস্যের নাম (Member Name)
                        </td>
                        <td style={{ padding: '7px 12px', width: '62%', color: '#0f172a', fontWeight: 800, fontSize: '13.5px' }}>
                          {receipt.memberName}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfd' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          সদস্য আইডি নং (Member ID)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#047857', fontWeight: 800 }}>
                          {toBanglaNumber(receipt.memberId)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          মোবাইল নম্বর (Mobile No)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#0f172a', fontWeight: 700 }}>
                          {receipt.mobile ? toBanglaNumber(receipt.mobile) : 'প্রযোজ্য নয়'}
                        </td>
                      </tr>
                      {receipt.address && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfd' }}>
                          <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                            ঠিকানা (Address)
                          </td>
                          <td style={{ padding: '7px 12px', color: '#0f172a', fontWeight: 600 }}>
                            {receipt.address}
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          জমার খাত / বিবরণ (Deposit Head)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#064e3b', fontWeight: 700 }}>
                          {receipt.depositHead || 'মাসিক সঞ্চয় জমা (Monthly Savings)'}
                        </td>
                      </tr>
                      {formattedMonth && (
                        <tr>
                          <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                            {formattedMonth.includes('-') ? 'সংশ্লিষ্ট মাস (For the Month)' : 'খাত / নোট (Head Details)'}
                          </td>
                          <td style={{ padding: '7px 12px', color: '#047857', fontWeight: 800 }}>
                            {formattedMonth.includes('-') ? formatBanglaMonth(formattedMonth) : formattedMonth}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', width: '38%', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          প্রজেক্টের নাম (Project Name)
                        </td>
                        <td style={{ padding: '7px 12px', width: '62%', color: '#0f172a', fontWeight: 800, fontSize: '13.5px' }}>
                          {receipt.projectName}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfd' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          প্রজেক্টের ধরন (Project Type)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#047857', fontWeight: 800 }}>
                          {receipt.projectType || 'বিনিয়োগ প্রজেক্ট'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          চালক / পরিচালনাকারী (Driver)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#0f172a', fontWeight: 700 }}>
                          {receipt.driverName}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfd' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          চালকের মোবাইল (Mobile No)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#0f172a', fontWeight: 700 }}>
                          {receipt.driverMobile ? toBanglaNumber(receipt.driverMobile) : 'প্রযোজ্য নয়'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                          আদায়ের খাত (Installment Head)
                        </td>
                        <td style={{ padding: '7px 12px', color: '#064e3b', fontWeight: 700 }}>
                          প্রজেক্ট মাসিক কিস্তি আদায় (Installment Return)
                        </td>
                      </tr>
                      {formattedMonth && (
                        <tr>
                          <td style={{ padding: '7px 12px', color: '#475569', fontWeight: 700, backgroundColor: '#fbfcfd' }}>
                            সংশ্লিষ্ট মাস (For the Month)
                          </td>
                          <td style={{ padding: '7px 12px', color: '#047857', fontWeight: 800 }}>
                            {formattedMonth}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* --- GRAND FINANCIAL AMOUNT BOX WITH PAID SEAL --- */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #059669',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px'
              }}
            >
              {/* Amount Figures & In Words */}
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  মোট প্রাপ্ত অর্থের পরিমাণ (Total Amount Received)
                </span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#064e3b', lineHeight: 1.15, marginTop: '2px' }}>
                  ৳ {banglaAmountFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginTop: '3px' }}>
                  কথায়: <span style={{ fontWeight: 600, color: '#064e3b' }}>{banglaAmountWords}</span>
                </div>
              </div>

              {/* Authentic Ink Stamp Simulation */}
              <div
                style={{
                  border: '2px solid #059669',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  textAlign: 'center',
                  transform: 'rotate(-4deg)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.15)',
                  flexShrink: 0
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 900, color: '#059669', letterSpacing: '1px' }}>
                  ★ PAID ★
                </div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#064e3b', lineHeight: 1.1 }}>
                  পরিশোধিত
                </div>
                <div style={{ fontSize: '8px', fontWeight: 700, color: '#047857', marginTop: '1px' }}>
                  EDA OFFICIAL
                </div>
              </div>
            </div>

            {/* --- DUAL SIGNATURES (CASHIER & AUTHORIZED SIGNATORY) --- */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: '6px',
                padding: '0 10px',
                marginBottom: '10px'
              }}
            >
              {/* Cashier / Collector Signature */}
              <div style={{ textAlign: 'center', width: '150px' }}>
                <div style={{ minHeight: '26px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                    {receipt.recordedBy || 'অফিস ক্যাশিয়ার'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '1.2px', backgroundColor: '#64748b', margin: '3px 0 3px 0' }} />
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                  আদায়কারীর স্বাক্ষর
                </span>
                <div style={{ fontSize: '8.5px', color: '#94a3b8', fontWeight: 600 }}>
                  (Received By)
                </div>
              </div>

              {/* President / Authorized Signatory */}
              <div style={{ textAlign: 'center', width: '150px' }}>
                <div style={{ minHeight: '26px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: '22px',
                      color: '#064e3b',
                      lineHeight: 1,
                      marginBottom: '-2px'
                    }}
                  >
                    Mohammad Shakhawat
                  </span>
                </div>
                <div style={{ width: '100%', height: '1.2px', backgroundColor: '#064e3b', margin: '3px 0 3px 0' }} />
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#064e3b' }}>
                  কর্তৃপক্ষের স্বাক্ষর
                </span>
                <div style={{ fontSize: '8.5px', color: '#047857', fontWeight: 700 }}>
                  (Chief Executive, EDA)
                </div>
              </div>
            </div>

            {/* --- SECURITY NOTICE & OFFICIAL FOOTER --- */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                borderTop: '1px dashed #cbd5e1',
                paddingTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9.5px',
                color: '#64748b'
              }}
            >
              <span>• এটি একটি ডিজিটালভাবে সংরক্ষিত মানি রসিদ</span>
              <span style={{ fontWeight: 600, color: '#047857' }}>www.eda-bd.org • হেল্পলাইন: ০১৮১৮-০৮৫২১৭</span>
              <span>প্রিন্ট: {printDateStr}</span>
            </div>
          </div>
        </div>

        {/* ===== ACTION BUTTONS & WHATSAPP SHARING ===== */}
        <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Download Image Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              fontSize: '0.95rem',
              fontWeight: 700,
              gap: '8px',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: isDownloading ? 'wait' : 'pointer'
            }}
          >
            {isDownloading ? (
              <>
                <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>রসিদের ছবি তৈরি হচ্ছে...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>রসিদ ডাউনলোড করুন (Download Image)</span>
              </>
            )}
          </button>

          {/* WhatsApp Sharing Section */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1.5px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={17} color="#16a34a" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#064e3b' }}>
                  WhatsApp-এ রসিদের বিবরণ পাঠান
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyReceiptNo}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedReceipt ? '#059669' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {copiedReceipt ? <Check size={13} /> : <Copy size={13} />}
                {copiedReceipt ? 'কপি হয়েছে' : 'রসিদ নং কপি'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="tel"
                  maxLength="16"
                  placeholder="মোবাইল নম্বর লিখুন..."
                  value={customNumber}
                  onChange={(e) => setCustomNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 32px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit',
                    background: 'white',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#25d366'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <a
                href={customNumber && customNumber.length >= 10 ? getWhatsAppLink(customNumber) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!customNumber || customNumber.length < 10) {
                    e.preventDefault();
                    return;
                  }
                  setSendStatus('sent');
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: customNumber && customNumber.length >= 10
                    ? 'linear-gradient(135deg, #25d366, #128c7e)'
                    : '#e2e8f0',
                  color: customNumber && customNumber.length >= 10 ? '#fff' : '#94a3b8',
                  fontWeight: 700,
                  cursor: customNumber && customNumber.length >= 10 ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: customNumber && customNumber.length >= 10 ? '0 4px 12px rgba(37,211,102,0.3)' : 'none',
                  textDecoration: 'none',
                  pointerEvents: customNumber && customNumber.length >= 10 ? 'auto' : 'none'
                }}
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>

            {sendStatus === 'sent' && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  fontSize: '0.78rem',
                  color: '#166534',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={14} color="#16a34a" /> রসিদের বিবরণসহ WhatsApp সফলভাবে খোলা হয়েছে!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
