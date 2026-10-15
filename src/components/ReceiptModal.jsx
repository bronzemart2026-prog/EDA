import React, { useRef, useState } from 'react';
import { X, Download, MessageCircle, Phone, CheckCircle } from 'lucide-react';

/**
 * ReceiptModal - Beautiful receipt with download and WhatsApp sharing
 * 
 * Props:
 *   receipt: {
 *     type: 'deposit' | 'installment'
 *     // deposit fields:
 *     memberName, memberId, mobile, address, month, amount, date, recordedBy
 *     // installment fields:
 *     projectName, projectType, driverName, driverMobile, month, amount, date, recordedBy
 *   }
 *   onClose: () => void
 */
export default function ReceiptModal({ receipt, onClose }) {
  const receiptRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sendStatus, setSendStatus] = useState(''); // '', 'copied', 'shared', 'error'

  if (!receipt) return null;

  const isDeposit = receipt.type === 'deposit';

  // Use the database record ID to make receipt number unique and persistent
  const uniqueIdPart = receipt.id ? receipt.id.slice(-8).toUpperCase() : Date.now().toString().slice(-8);
  const receiptNumber = `RCP-${uniqueIdPart}`;

  const printDate = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const printTime = new Date().toLocaleTimeString('bn-BD', {
    hour: '2-digit', minute: '2-digit'
  });

  // The number to pre-fill in WhatsApp
  const defaultPhone = isDeposit ? receipt.mobile : receipt.driverMobile;
  const [customNumber, setCustomNumber] = useState(defaultPhone || '');

  // Format the WhatsApp message text
  const buildWhatsAppText = () => {
    const orgName = 'স্বপ্নের বাতিঘর ';
    const lines = [
      `🏦 *${orgName}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📋 *রশিদ নম্বর:* ${receiptNumber}`,
      ``,
      isDeposit
        ? `👤 *সদস্য:* ${receipt.memberName}\n🆔 *আইডি:* ${receipt.memberId}\n📱 *মোবাইল:* ${receipt.mobile}`
        : `🚗 *প্রজেক্ট:* ${receipt.projectName}\n👷 *চালক:* ${receipt.driverName}\n📱 *মোবাইল:* ${receipt.driverMobile}`,
      ``,
      `📅 *মাস:* ${receipt.month}`,
      `📆 *তারিখ:* ${receipt.date}`,
      `💰 *পরিমাণ:* ${receipt.amount} ৳`,
      ``,
      isDeposit ? `✅ মাসিক সঞ্চয় সফলভাবে জমা হয়েছে।` : `✅ কিস্তি সফলভাবে আদায় হয়েছে।`,
      ``,
      `ধন্যবাদ! 🙏`,
    ];
    return lines.join('\n');
  };

  // Generate receipt canvas (shared by download and WhatsApp send)
  const generateCanvas = async () => {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(receiptRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
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
      link.download = `Receipt_${receiptNumber}.png`;
      link.click();
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 300 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '96dvh', padding: '16px 14px 24px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3 style={{ color: 'var(--primary-dark)' }}>
            {isDeposit ? '💳 সঞ্চয় জমার রশিদ' : '💳 কিস্তি আদায়ের রশিদ'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* ===== RECEIPT CARD ===== */}
        <div
          ref={receiptRef}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(29,78,216,0.13)',
            border: '1.5px solid rgba(29,78,216,0.15)',
            fontFamily: "'Hind Siliguri', sans-serif",
            position: 'relative',
          }}
        >
          {/* Watermark in background */}
          <div style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.05,
            width: '160px',
            height: '160px',
            pointerEvents: 'none',
            zIndex: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src="/main_logo.png"
              alt="Watermark"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* Receipt Header Gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
            padding: '14px 16px 10px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-30px', left: '-10px',
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }} />

            {/* Logo */}
            <div style={{
              display: 'flex', justifyContent: 'center', marginBottom: '6px',
            }}>
              <img
                src="/main_logo.png"
                alt="Logo"
                style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                  backgroundColor: '#fff',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <h2 style={{
              color: '#ffffff', fontSize: '1.05rem', fontWeight: 800,
              marginBottom: '2px', textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}>
              স্বপ্নের বাতিঘর
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.68rem', letterSpacing: '0.3px' }}>
              সঞ্চয় ও বিনিয়োগ ব্যবস্থাপনা সমিতি
            </p>

            {/* Paid stamp */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'rgba(255,255,255,0.18)', borderRadius: '20px',
              padding: '2px 10px', marginTop: '6px', border: '1px solid rgba(255,255,255,0.3)',
            }}>
              <CheckCircle size={11} color="#86efac" />
              <span style={{ color: '#86efac', fontSize: '0.7rem', fontWeight: 700 }}>
                সফলভাবে গ্রহণ করা হয়েছে
              </span>
            </div>
          </div>

          {/* Zigzag divider */}
          <div style={{
            height: '10px',
            background: `radial-gradient(circle at 5px -3px, #f1f5f9 6px, #1d4ed8 6px)`,
            backgroundSize: '10px 10px',
            backgroundRepeat: 'repeat-x',
            position: 'relative',
            zIndex: 1,
          }} />

          {/* Receipt Body */}
          <div style={{ padding: '10px 14px', position: 'relative', zIndex: 1 }}>
            {/* Receipt Number + Date */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '8px', padding: '6px 8px',
              background: 'linear-gradient(135deg, #f0fdf4, #f8fafc)',
              borderRadius: '8px', border: '1px solid rgba(22,163,74,0.15)',
            }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>রশিদ নম্বর</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.5px' }}>
                  {receiptNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>প্রিন্টের তারিখ</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#334155' }}>
                  {printDate} • {printTime}
                </div>
              </div>
            </div>

            {/* Type Badge */}
            <div style={{
              textAlign: 'center', marginBottom: '8px',
            }}>
              <span style={{
                background: isDeposit
                  ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
                  : 'linear-gradient(135deg, #d97706, #f59e0b)',
                color: '#fff', padding: '3px 12px', borderRadius: '20px',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px',
                boxShadow: isDeposit ? '0 2px 6px rgba(29, 78, 216, 0.2)' : '0 2px 6px rgba(217,119,6,0.2)',
              }}>
                {isDeposit ? '🏦 মাসিক সঞ্চয় জমা' : '🚗 কিস্তি আদায়'}
              </span>
            </div>

            {/* Info rows */}
            <div style={{
              borderRadius: '10px', overflow: 'hidden',
              border: '1px solid #e2e8f0', marginBottom: '8px',
              background: 'rgba(255,255,255,0.85)',
            }}>
              {isDeposit ? (
                <>
                  <InfoRow label="সদস্যের নাম" value={receipt.memberName} icon="👤" />
                  <InfoRow label="সদস্য আইডি" value={receipt.memberId} icon="🆔" alt />
                  <InfoRow label="মোবাইল নম্বর" value={receipt.mobile} icon="📱" />
                </>
              ) : (
                <>
                  <InfoRow label="প্রজেক্টের নাম" value={receipt.projectName} icon="📋" />
                  <InfoRow label="প্রজেক্ট ধরন" value={receipt.projectType} icon="🚗" alt />
                  <InfoRow label="চালকের নাম" value={<strong style={{ fontWeight: 900, color: '#1d4ed8' }}>{receipt.driverName}</strong>} icon="👷" />
                  <InfoRow label="চালক মোবাইল" value={<strong style={{ fontWeight: 900, color: '#1d4ed8' }}>{receipt.driverMobile}</strong>} icon="📱" alt />
                </>
              )}
              <InfoRow label="মাস" value={receipt.month} icon="📅" alt={isDeposit ? true : false} />
              <InfoRow label="তারিখ" value={receipt.date} icon="📆" alt={isDeposit ? false : true} />
              {receipt.recordedBy && <InfoRow label="সংগ্রাহক" value={receipt.recordedBy} icon="👨‍💼" alt={isDeposit ? true : false} />}
            </div>

            {/* Amount Highlight */}
            <div style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
              borderRadius: '12px', padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '8px',
              boxShadow: '0 3px 12px rgba(29, 78, 216, 0.2)',
            }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.68rem', fontWeight: 600 }}>
                  {isDeposit ? 'জমাকৃত পরিমাণ' : 'আদায়কৃত পরিমাণ'}
                </div>
                <div style={{
                  color: '#ffffff', fontSize: '1.45rem', fontWeight: 900,
                  lineHeight: 1.1, marginTop: '2px',
                  textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}>
                  ৳ {Number(receipt.amountRaw || 0).toLocaleString('bn-BD')}
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.18)',
                borderRadius: '50%', width: '38px', height: '38px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem',
              }}>
                💰
              </div>
            </div>

            {/* Signature Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '2px 4px',
              marginBottom: '6px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <img
                  src="/signature.png"
                  alt="Signature"
                  style={{
                    height: '42px',
                    width: 'auto',
                    objectFit: 'contain',
                    mixBlendMode: 'multiply',
                    display: 'block',
                    margin: '0 auto -4px auto'
                  }}
                />
                <div style={{
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '2px',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: '#475569',
                  minWidth: '100px'
                }}>
                  সভাপতি স্বাক্ষর
                </div>
              </div>
            </div>

            {/* Developer Credit Footer */}
            <div style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px dashed #cbd5e1',
              textAlign: 'center',
              fontSize: '0.65rem',
              color: '#64748b',
              fontWeight: 500,
              lineHeight: 1.4,
              position: 'relative',
              zIndex: 1,
            }}>
              <div style={{ marginBottom: '2px' }}>
                Developed by: <span style={{ color: '#1d4ed8', fontWeight: 700 }}>Md Arif Uddin</span>
              </div>
              <div>
                📱 <a
                  href="https://wa.me/8801825334505"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}
                >
                  01825334505 (WhatsApp)
                </a>
              </div>
            </div>

            {/* Bottom zigzag */}
            <div style={{
              height: '10px',
              background: `radial-gradient(circle at 5px 13px, #f1f5f9 6px, #fff 6px)`,
              backgroundSize: '10px 10px',
              backgroundRepeat: 'repeat-x',
              position: 'relative',
              zIndex: 1,
            }} />
          </div>
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '13px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              opacity: isDownloading ? 0.75 : 1,
              boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            <Download size={18} />
            {isDownloading ? 'ডাউনলোড হচ্ছে...' : 'ছবি ডাউনলোড করুন'}
          </button>

          {/* WhatsApp sharing controls */}
          <div style={{
            background: '#f0fdf4', borderRadius: '12px', padding: '14px',
            border: '1.5px solid rgba(37,211,102,0.3)',
          }}>
            <p style={{
              fontSize: '0.82rem', fontWeight: 700, color: '#16a34a',
              marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <MessageCircle size={16} />
              বিবরণ WhatsApp-এ পাঠান
            </p>
            <p style={{ fontSize: '0.72rem', color: '#166534', marginBottom: '10px', fontWeight: 500 }}>
              📱 সরাসরি WhatsApp-এ রশিদের বিবরণ ও নম্বরসহ টেক্সট মেসেজ পাঠানো হবে
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={15} style={{
                  position: 'absolute', left: '10px', top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8',
                  pointerEvents: 'none',
                }} />
                <input
                  type="tel"
                  maxLength="16"
                  placeholder="নম্বর লিখুন..."
                  value={customNumber}
                  onChange={(e) => setCustomNumber(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 12px 11px 33px',
                    borderRadius: '10px', border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem', fontFamily: 'inherit',
                    background: 'white', outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
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
                  padding: '11px 14px', borderRadius: '10px', border: 'none',
                  background: customNumber.length >= 10
                    ? 'linear-gradient(135deg, #25d366, #128c7e)'
                    : '#e2e8f0',
                  color: customNumber.length >= 10 ? '#fff' : '#94a3b8',
                  fontWeight: 700,
                  cursor: customNumber.length >= 10 ? 'pointer' : 'not-allowed',
                  fontSize: '0.82rem', fontFamily: 'inherit',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  boxShadow: customNumber.length >= 10
                    ? '0 4px 12px rgba(37,211,102,0.3)' : 'none',
                  minWidth: '120px', justifyContent: 'center',
                  textDecoration: 'none',
                  pointerEvents: customNumber.length >= 10 ? 'auto' : 'none',
                }}
              >
                <MessageCircle size={16} /> WhatsApp-এ পাঠান
              </a>
            </div>

            {/* Status feedback banners */}
            {sendStatus === 'sent' && (
              <div style={{
                marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                background: '#dcfce7', border: '1px solid #86efac',
                fontSize: '0.78rem', color: '#166534', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                ✅ রশিদের বিবরণসহ WhatsApp খোলা হয়েছে!
              </div>
            )}
            {sendStatus === 'error' && (
              <div style={{
                marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                background: '#fef2f2', border: '1px solid #fca5a5',
                fontSize: '0.78rem', color: '#991b1b', fontWeight: 600,
              }}>
                ⚠️ WhatsApp লিংক তৈরি বা ওপেন করতে সমস্যা হয়েছে।
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small helper row component for receipt info */
function InfoRow({ label, value, icon, alt }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 8px',
      background: alt ? '#f8fafc' : '#ffffff',
      borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, minWidth: '70px', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.78rem', fontWeight: 700, color: '#1e293b',
        flex: 1, textAlign: 'right', wordBreak: 'break-word',
      }}>
        {value}
      </span>
    </div>
  );
}
