import React from 'react';

export default function Footer() {
  return (
    <footer 
      style={{
        textAlign: 'center',
        padding: '16px 10px 24px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        borderTop: '1px dashed var(--border)',
        marginTop: '24px',
        lineHeight: 1.5
      }} 
      className="system-footer"
    >
      <div>
        Developed by: <strong style={{ color: 'var(--primary-dark)' }}>Md Arif Uddin</strong> |{' '}
        <a 
          href="https://wa.me/8801825334505" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}
        >
          01825334505 (WhatsApp)
        </a>
      </div>
    </footer>
  );
}
