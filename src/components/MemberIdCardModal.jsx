import React, { useRef, useState } from 'react';
import { X, Download, Phone, CreditCard, Briefcase, Home, Users, Check, Calendar, Droplet } from 'lucide-react';
import { toBanglaNumber } from '../utils/bangla';

export default function MemberIdCardModal({ member, onClose }) {
  const cardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!member) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const { default: html2canvas } = await import('html2canvas');

      // Ensure all images are loaded before rasterization
      const images = cardRef.current.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Ultra-high resolution (3x) for crisp print/download
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const sanitizedName = (member.name || 'member').replace(/\s+/g, '_');
      link.download = `EDA_ID_Card_${sanitizedName}_${member.memberId || 'ID'}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('ID card generation failed:', err);
      alert('আইডি কার্ড ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsDownloading(false);
    }
  };

  // Format Helper for Dates
  const formatBanglaDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${toBanglaNumber(d)}/${toBanglaNumber(m)}/${toBanglaNumber(y)}`;
      }
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        return `${toBanglaNumber(day)}/${toBanglaNumber(month)}/${toBanglaNumber(year)}`;
      }
    } catch (e) {
      return '';
    }
    return '';
  };

  // Clean data fields - NO DUMMY VALUES, strictly what exists on the member
  const rawDesignation = member.designation?.trim() || '';
  const memberIdText = member.memberId ? toBanglaNumber(member.memberId) : '';
  const mobileText = member.mobile?.trim() ? toBanglaNumber(member.mobile.trim()) : '';
  const nidText = member.nid?.trim() ? toBanglaNumber(member.nid.trim()) : '';
  const professionText = member.profession?.trim() || '';
  const addressText = member.address?.trim() || '';
  const referenceText = member.nomineeName?.trim() || '';
  const joiningDateText = member.joiningDate ? formatBanglaDate(member.joiningDate) : '';
  const bloodGroupText = member.bloodGroup?.trim() || '';

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
          padding: '16px',
          borderRadius: '20px',
          maxHeight: '96vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--bg-card, #ffffff)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto'
        }}
      >
        {/* Modal Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
              সদস্য আইডি কার্ড (Member ID Card)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              উচ্চ রেজোলিউশন প্রিন্ট ও ডাউনলোডের উপযোগী ফরম্যাট
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

        {/* Download Action Button */}
        <div style={{ width: '100%', display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="btn btn-primary"
            style={{
              flex: 1,
              height: '44px',
              fontSize: '0.95rem',
              fontWeight: 700,
              gap: '8px',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              background: downloadSuccess ? '#059669' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: isDownloading ? 'wait' : 'pointer'
            }}
          >
            {isDownloading ? (
              <>
                <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>কার্ড তৈরি হচ্ছে...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check size={18} />
                <span>ডাউনলোড সম্পন্ন হয়েছে!</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>আইডি কার্ড ডাউনলোড করুন (Download Image)</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ACTUAL ID CARD CONTAINER TO RENDER & EXPORT                              */}
        {/* Standard executive CR80 proportions: 460px width x 730px height          */}
        {/* ========================================================================= */}
        <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: '6px' }}>
          <div
            ref={cardRef}
            id="eda-id-card-render"
            style={{
              width: '460px',
              minWidth: '460px',
              height: '730px',
              backgroundColor: '#ffffff',
              position: 'relative',
              borderRadius: '22px',
              overflow: 'hidden',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.12)',
              border: '1.5px solid #cbd5e1',
              fontFamily: "'Hind Siliguri', sans-serif",
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            {/* --- TOP BRAND HEADER BANNER --- */}
            <div
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #064e3b 0%, #047857 65%, #059669 100%)',
                padding: '16px 18px 14px 18px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
                boxShadow: '0 4px 12px rgba(6, 78, 59, 0.18)'
              }}
            >
              {/* EDA Logo badge (single crisp logo without duplicate text) */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '13px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
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

              {/* Title & Slogan */}
              <div style={{ marginLeft: '13px', flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '16.5px',
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.2,
                    letterSpacing: '-0.2px',
                    fontFamily: 'sans-serif'
                  }}
                >
                  Entrepreneur Development Association
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#fde68a', fontFamily: 'sans-serif' }}>
                    (EDA)
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>•</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#d1fae5' }}>
                    কর্মই মূলধন, বিনিয়োগে-ই উন্নয়ন
                  </span>
                </div>
              </div>

              {/* Top Right Card Badge */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '4px 9px',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                  letterSpacing: '0.3px'
                }}
              >
                সদস্য পরিচয়পত্র
              </div>
            </div>

            {/* Gold Ribbon Divider */}
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, #b45309 0%, #f59e0b 50%, #fbbf24 100%)'
              }}
            />

            {/* --- MEMBER PHOTO & NAME SECTION --- */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', position: 'relative', zIndex: 2 }}>
              {/* Photo Frame */}
              <div
                style={{
                  width: '132px',
                  height: '152px',
                  borderRadius: '16px',
                  border: '3px solid #047857',
                  overflow: 'hidden',
                  boxShadow: '0 8px 20px rgba(4, 120, 87, 0.18)',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '30px',
                        fontWeight: 800
                      }}
                    >
                      {member.name?.charAt(0) || 'স'}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: 600 }}>ছবি নেই</span>
                  </div>
                )}
              </div>

              {/* Member Name */}
              <h2
                style={{
                  margin: '12px 0 0 0',
                  fontSize: '21px',
                  fontWeight: 800,
                  color: '#064e3b',
                  letterSpacing: '0.3px',
                  textAlign: 'center',
                  maxWidth: '420px',
                  lineHeight: 1.2
                }}
              >
                {member.name}
              </h2>

              {/* ID & Optional Designation Badges */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {memberIdText && (
                  <span
                    style={{
                      backgroundColor: '#064e3b',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 14px',
                      borderRadius: '20px',
                      boxShadow: '0 2px 6px rgba(6, 78, 59, 0.2)'
                    }}
                  >
                    সদস্য আইডি: {memberIdText}
                  </span>
                )}
                {rawDesignation && (
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 14px',
                      borderRadius: '20px',
                      boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)'
                    }}
                  >
                    {rawDesignation}
                  </span>
                )}
              </div>
            </div>

            {/* --- INFORMATION DETAILS BOX --- */}
            <div
              style={{
                margin: '14px 22px 0 22px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '8px 16px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Subtle EDA Watermark */}
              <div
                style={{
                  position: 'absolute',
                  right: '10px',
                  bottom: '-15px',
                  width: '130px',
                  height: '130px',
                  opacity: 0.04,
                  pointerEvents: 'none'
                }}
              >
                <img
                  src="/main_logo.png"
                  alt="Watermark"
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Information Rows (Only fields with valid data are shown) */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Mobile */}
                {mobileText && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                      <Phone size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b' }}>
                      মোবাইল নাম্বার
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b' }}>:</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {mobileText}
                    </span>
                  </div>
                )}

                {/* NID */}
                {nidText && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                      <CreditCard size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b' }}>
                      জাতীয় পরিচয়পত্র নং
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b' }}>:</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {nidText}
                    </span>
                  </div>
                )}

                {/* Profession */}
                {professionText && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                      <Briefcase size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b' }}>
                      পেশা
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b' }}>:</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {professionText}
                    </span>
                  </div>
                )}

                {/* Address */}
                {addressText && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '5px 0', borderBottom: (referenceText || joiningDateText || bloodGroupText) ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0, marginTop: '2px' }}>
                      <Home size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b', paddingTop: '1px' }}>
                      স্থায়ী ঠিকানা
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b', paddingTop: '1px' }}>:</span>
                    <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: '#0f172a', lineHeight: 1.35, paddingTop: '1px' }}>
                      {addressText}
                    </span>
                  </div>
                )}

                {/* Reference / Nominee */}
                {referenceText && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: (joiningDateText || bloodGroupText) ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                      <Users size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b' }}>
                      রেফারেন্স
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b' }}>:</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {referenceText}
                    </span>
                  </div>
                )}

                {/* Blood Group */}
                {bloodGroupText && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: joiningDateText ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                      <Droplet size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b' }}>
                      রক্তের গ্রুপ
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b' }}>:</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                      {bloodGroupText}
                    </span>
                  </div>
                )}

                {/* Joining Date */}
                {joiningDateText && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                      <Calendar size={13} />
                    </div>
                    <span style={{ width: '130px', marginLeft: '10px', fontSize: '13.5px', fontWeight: 700, color: '#064e3b' }}>
                      যোগদানের তারিখ
                    </span>
                    <span style={{ width: '14px', fontWeight: 700, color: '#064e3b' }}>:</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {joiningDateText}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* --- FOOTER & AUTHORITY SIGNATURE (Safe distance above bottom strip, zero collision) --- */}
            <div
              style={{
                marginTop: 'auto',
                padding: '0 22px 14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                position: 'relative',
                zIndex: 2
              }}
            >
              {/* Authority Signature */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#047857',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginBottom: '3px'
                  }}
                >
                  কর্তৃপক্ষের স্বাক্ষর (Authorized Signatory)
                </span>
                <span
                  style={{
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: '24px',
                    color: '#064e3b',
                    lineHeight: 1,
                    marginBottom: '-2px',
                    paddingLeft: '2px'
                  }}
                >
                  Mohammad Shakhawat
                </span>
                <div style={{ width: '145px', height: '1.5px', backgroundColor: '#064e3b', margin: '3px 0 4px 0' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#064e3b', lineHeight: 1.2, fontFamily: 'sans-serif' }}>
                  Mohammad Shakhawat
                </span>
                <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#047857', lineHeight: 1.2, fontFamily: 'sans-serif' }}>
                  Chief Executive (প্রধান নির্বাহী)
                </span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#475569', lineHeight: 1.2, fontFamily: 'sans-serif' }}>
                  Entrepreneur Development Association (EDA)
                </span>
              </div>

              {/* Seal / Motto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
                  }}
                >
                  <img
                    src="/main_logo.png"
                    alt="EDA Logo"
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#064e3b', fontFamily: 'sans-serif' }}>
                    Together for a
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', fontFamily: 'sans-serif' }}>
                    Better Future
                  </span>
                  <span style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 700 }}>
                    অনুমোদিত পরিচয়পত্র
                  </span>
                </div>
              </div>
            </div>

            {/* --- BOTTOM SLEEK DECORATIVE ACCENT STRIP (Guarantees zero text collision) --- */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'linear-gradient(90deg, #064e3b 0%, #047857 50%, #0284c7 100%)',
                borderTop: '2.5px solid #f59e0b',
                flexShrink: 0
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
