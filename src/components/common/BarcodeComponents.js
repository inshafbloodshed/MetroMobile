import React from 'react';
import { encodeCode128 } from '../../utils/barcode';
import { encryptCost } from '../../utils/encryption';

export function BarcodeSVG({ value, width = 160, height = 36 }) {
  const bits = encodeCode128(value);
  const barW = width / bits.length;
  const bars = [];
  let x = 0;
  
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      bars.push(<rect key={i} x={x} y={0} width={barW} height={height} fill="#000" />);
    }
    x += barW;
  }
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}
      xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {bars}
    </svg>
  );
}

export function BarcodeLabel({ line, grnId }) {
  const encCost = line.encryptedCost || encryptCost(line.costPrice);
  
  return (
    <div style={{
      border: '1px solid #999',
      borderRadius: 3,
      padding: '5px 7px',
      width: 200,
      fontFamily: 'monospace',
      background: '#fff',
      color: '#000',
      fontSize: 9,
    }}>
      <div style={{ fontWeight: 700, fontSize: 10, textAlign: 'center', letterSpacing: '0.06em', marginBottom: 2 }}>
        METROPHONE SHOP
      </div>
      <BarcodeSVG value={line.barcodeNum} width={184} height={32} />
      <div style={{ textAlign: 'center', fontSize: 7, letterSpacing: '0.1em', margin: '2px 0' }}>
        {line.barcodeNum}
      </div>
      <div style={{ fontWeight: 600, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {line.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginTop: 2 }}>
        <span>GRN: <b>{grnId}</b></span>
        <span><b>{encCost}</b></span>
      </div>
    </div>
  );
}
