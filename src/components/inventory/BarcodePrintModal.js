// src/components/inventory/BarcodePrintModal.js
import React from 'react';
import { Modal } from '../common/Modal';
import { styles } from '../../utils/styles';
import { BarcodeLabel } from '../common/BarcodeComponents';
import { barcodeSVGString } from '../../utils/barcode';
import { encryptCost } from '../../utils/encryption';
import { toast } from '../../utils/storage';

// Generate print HTML
const generatePrintHTML = (lines, grnId) => {
  const labelHTMLBlocks = [];

  lines.forEach(line => {
    const encCost = line.encryptedCost || encryptCost(line.costPrice || 0);
    const qty = line.qty || 1;

    const singleLabel = `
      <div class="label">
        <div class="store">METROPHONE SHOP</div>
        <div class="barcode">${barcodeSVGString(line.barcodeNum)}</div>
        <div class="bnum">${line.barcodeNum}</div>
        <div class="pname">${line.name}</div>
        <div class="meta">
          <span>GRN: <b>${grnId}</b></span>
          <span><b>${encCost}</b></span>
        </div>
      </div>`;

    for (let i = 0; i < qty; i++) {
      labelHTMLBlocks.push(singleLabel);
    }
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Barcodes — ${grnId}</title>
  <style>
    @page {
      size: 50mm 25mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      width: 50mm;
      height: 25mm;
      padding: 1mm 1.5mm;
      overflow: hidden;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .label:last-child {
      page-break-after: avoid;
    }
    .store {
      font-size: 7pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.05em;
      line-height: 1;
    }
    .barcode {
      display: flex;
      justify-content: center;
      flex: 1;
      align-items: center;
    }
    .barcode svg {
      display: block;
      width: 46mm;
      height: 8mm;
    }
    .bnum {
      font-size: 5pt;
      text-align: center;
      letter-spacing: 0.1em;
      line-height: 1;
    }
    .pname {
      font-size: 6pt;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 5.5pt;
      line-height: 1;
    }
    svg rect {
      fill: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media screen {
      body {
        background: #f0f0f0;
        padding: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: flex-start;
      }
      .label {
        border: 1px solid #bbb;
        border-radius: 3px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        page-break-after: unset;
        height: auto;
        min-height: 25mm;
        width: 50mm;
      }
    }
  </style>
</head>
<body>
  ${labelHTMLBlocks.join('\n')}
  <script>
    window.onload = function() {
      setTimeout(function() { 
        window.print(); 
      }, 500);
    };
  <\/script>
</body>
</html>`;
};

// ✅ ELECTRON PRINT FUNCTION
export function printBarcodesForPrinterx(lines, grnId) {
  if (!lines || lines.length === 0) {
    toast('No barcodes to print');
    return;
  }

  const printHTML = generatePrintHTML(lines, grnId);

  try {
    // ✅ Check if we're in Electron
    if (window.api && window.api.printHtml) {
      // Use Electron's print API
      window.api.printHtml(printHTML, 'barcode');
      return;
    }

    // ✅ Fallback: Create a new window for printing (browser fallback)
    const printWindow = window.open('', '_blank', 'width=700,height=500');
    
    if (!printWindow) {
      // If popup is blocked, download the HTML
      const blob = new Blob([printHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcodes_${grnId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast('📄 Barcode HTML downloaded. Open it to print.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
  } catch (error) {
    console.error('Print error:', error);
    toast('Error printing. Please try again.');
  }
}

export function BarcodePrintModal({ lines, grnId, onClose }) {
  const totalLabels = lines ? lines.reduce((s, l) => s + (l.qty || 1), 0) : 0;

  if (!lines || lines.length === 0) {
    return (
      <Modal title="🏷️ No Barcodes" onClose={onClose}>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div>No barcodes to print</div>
          <button style={styles.btnPrimary} onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`🏷️ Barcodes — ${grnId}`} onClose={onClose}>
      <div style={{ maxHeight: '75vh', overflowY: 'auto', minWidth: 520 }}>
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 6, padding: '8px 12px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12,
        }}>
          <div>
            <strong>🖨️ Printerx Thermal</strong> — 50mm × 25mm labels<br />
            <span style={{ color: '#555' }}>
              🔐 Cost key: D=1 A=2 I=3 L=4 Y=5 M=6 E=7 T=8 R=9 O=0
            </span>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
            {totalLabels} labels
            <div style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>
              ({lines.length} product{lines.length !== 1 ? 's' : ''} × qty)
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, fontWeight: 600 }}>
            LABEL PREVIEW (1 shown per product — prints QTY copies each):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <BarcodeLabel line={l} grnId={grnId} />
                <div style={{
                  position: 'absolute', top: -8, right: -8,
                  background: '#2563eb', color: '#fff',
                  borderRadius: '50%', width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, border: '2px solid #fff',
                }}>
                  {l.qty || 1}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 8 }}>
            ⓘ The blue badge = number of copies that will print for that product.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <button
            style={styles.btnPrimary}
            onClick={() => printBarcodesForPrinterx(lines, grnId)}
          >
            🖨️ Print {totalLabels} Labels (Printerx)
          </button>
          <button style={styles.btnOutline} onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}