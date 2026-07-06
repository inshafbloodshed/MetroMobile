import React from 'react';

export function FormGrid({ children, cols = 2, style }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${cols}, 1fr)`, 
      gap: 18, 
      ...style 
    }}>
      {children}
    </div>
  );
}

export default FormGrid;