import React from 'react';
import { styles } from '../../utils/styles';

export function Modal({ title, onClose, children, maxWidth = 900 }) {
  return (
    <div style={styles.modalOverlay} onClick={e => { 
      if (e.target === e.currentTarget) onClose(); 
    }}>
      <div style={{ 
        ...styles.modal, 
        maxWidth: maxWidth,
        background: 'rgba(255,255,255,0.95)', 
        backdropFilter: 'blur(16px)', 
        border: '1px solid rgba(255,255,255,0.5)', 
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20, 
          borderBottom: '2px solid #dbeafe', 
          paddingBottom: 12 
        }}>
          <div style={{ 
            fontSize: 20, 
            fontWeight: 800, 
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            backgroundClip: 'text' 
          }}>
            {title}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: 24, 
              cursor: 'pointer', 
              color: '#94a3b8',
              padding: '4px 8px',
              borderRadius: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}