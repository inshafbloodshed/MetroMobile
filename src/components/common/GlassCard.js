import React from 'react';
import { styles } from '../../utils/styles';

export function GlassCard({ title, badge, children }) {
  return (
    <div style={styles.glassCard}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20, 
        flexWrap: 'wrap', 
        gap: 12 
      }}>
        <div style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #1e293b, #334155)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          backgroundClip: 'text' 
        }}>
          {title}
        </div>
        {badge !== undefined && <span style={styles.badge}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}