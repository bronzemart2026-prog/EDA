import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, HelpCircle, CheckCircle } from 'lucide-react';

export default function InstallAppButton({ variant = 'banner' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone/PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction
      alert('আপনার ব্রাউজারের মেন্যু (⋮) থেকে "Install app" বা "Add to Home Screen" চাপুন।');
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  // Variant: Top header / compact button
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          type="button"
          style={{
            background: 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
          title="ফোনে অ্যাপ ইনস্টল করুন"
        >
          <Smartphone size={13} />
          <span>অ্যাপ ইনস্টল</span>
        </button>

        {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} />}
      </>
    );
  }

  // Variant: Banner (Home / Login / Profile)
  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #047857 50%, #0284c7 100%)',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <img
            src="/main_logo.png"
            alt="App Icon"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              padding: '2px',
              objectFit: 'contain',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.2px' }}>
              ফোনে অ্যাপ হিসেবে ইনস্টল করুন
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.88)', marginTop: '1px' }}>
              হোম স্ক্রিনে আইকন রেখে এক ক্লিকেই সহজে প্রবেশ করুন
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleInstallClick}
            type="button"
            style={{
              backgroundColor: '#ffffff',
              color: '#064e3b',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            <Download size={13} color="#047857" />
            <span>ইনস্টল</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0
            }}
            title="লুকান"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}

function IOSModal({ onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          maxWidth: '340px',
          width: '100%',
          padding: '20px',
          color: '#1e293b',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Smartphone size={26} color="#047857" />
        </div>

        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#064e3b', marginBottom: '8px' }}>
          আইফোনে অ্যাপ ইনস্টল নির্দেশিকা
        </h3>

        <div style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'left', lineHeight: 1.6, marginBottom: '16px' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            ১. Safari ব্রাউজারের নিচের <strong>Share (শেয়ার ⎋)</strong> আইকনটি চাপুন।
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            ২. নিচে স্ক্রল করে <strong>"Add to Home Screen" (+ হোম স্ক্রিনে যোগ করুন)</strong> নির্বাচন করুন।
          </p>
          <p style={{ margin: 0 }}>
            ৩. উপরে <strong>"Add"</strong> চাপলেই আপনার ফোনের হোম স্ক্রিনে EDA অ্যাপ আইকন যুক্ত হবে!
          </p>
        </div>

        <button
          onClick={onClose}
          type="button"
          style={{
            width: '100%',
            backgroundColor: '#047857',
            color: '#ffffff',
            border: 'none',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          বুঝেছি
        </button>
      </div>
    </div>
  );
}
