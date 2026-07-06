import { C128_PATTERNS, C128B_VAL } from './constants';
import { encryptCost } from './encryption';

export function encodeCode128(text) {
  const START_B = 104;
  let bits = C128_PATTERNS[START_B];
  let check = START_B;
  
  for (let i = 0; i < text.length; i++) {
    const v = C128B_VAL[text[i]] ?? 0;
    check += v * (i + 1);
    bits += C128_PATTERNS[v];
  }
  
  bits += C128_PATTERNS[check % 103];
  bits += C128_PATTERNS[106];
  bits += '11';
  
  return bits;
}

export function barcodeSVGString(value) {
  const bits = encodeCode128(value);
  const W = 160, H = 36;
  const barW = W / bits.length;
  let rects = '';
  let x = 0;
  
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${barW.toFixed(2)}" height="${H}" fill="#000"/>`;
    }
    x += barW;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${rects}</svg>`;
}

export function genBarcodeNumber(productId, grnSeqNum, lineIndex) {
  return (
    String(productId).padStart(4, '0') +
    String(grnSeqNum).padStart(5, '0') +
    String(lineIndex).padStart(2, '0')
  );
}

export function generateBarcodeHTML(lines, grnId) {
  const labelHTMLBlocks = [];

  lines.forEach(line => {
    const encCost = line.encryptedCost || encryptCost(line.costPrice);
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

  return labelHTMLBlocks.join('\n');
}

export function printBarcodes(lines, grnId) {
  const printHTML = `<!DOCTYPE html>
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
  ${generateBarcodeHTML(lines, grnId)}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  <\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=700,height=500');
  if (!w) {
    alert('Pop-up blocked! Please allow pop-ups for this page and try again.');
    return;
  }
  w.document.open();
  w.document.write(printHTML);
  w.document.close();
}