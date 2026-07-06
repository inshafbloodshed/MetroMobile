import React from 'react';

export function Field({ label, children, style, required = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={{ 
        fontSize: 12, 
        fontWeight: 600, 
        color: '#475569', 
        textTransform: 'uppercase', 
        letterSpacing: '0.5px' 
      }}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
}