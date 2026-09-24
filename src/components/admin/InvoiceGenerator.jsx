import React, { useState, useRef } from 'react';
import { Download, Plus, Trash2, Printer, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import signatureImg from '../../assets/signature.png';
import stampImg from '../../assets/stamp.png';
import signatoryImg from '../../assets/signatory.png';

// Permanent supplier details: these appear on every invoice and are not editable
const FROM_DETAILS = [
  'MS GATE ACADEMY',
  'OTHAKKALMANDAPAM',
  'COIMBATORE',
  '8012052331',
  'msamy5031@gmail.com',
  'PAN: CTFPM7085P'
];
const BANK_DETAILS = [
  ['Account name', 'MUTHU SAMY M'],
  ['Account number', '34003918492'],
  ['IFSC', 'SBIN0015017'],
  ['Bank & branch', 'STATE BANK OF INDIA, MALUMICHAMPATTI']
];
const GST_NOTE = 'Supplier is not registered under GST. No GST charged.';


const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

// 0-99 -> "Thirty-One"
const twoDigits = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));

// Indian numbering: "Rupees Thirty-One Thousand Five Hundred only"
const amountToWords = (amount) => {
  let n = Math.floor(Number(amount) || 0);
  if (n === 0) return 'Rupees Zero only';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(twoDigits(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (hundred) parts.push(ONES[hundred] + ' Hundred');
  if (n) parts.push((parts.length ? 'and ' : '') + twoDigits(n));
  return 'Rupees ' + parts.join(' ') + ' only';
};

export default function InvoiceGenerator() {
  const [toAddress, setToAddress] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('GATE TEST SERIES - 001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ id: 1, particulars: '', rate: 0, quantity: 1, unit: 'students' }]);
  const invoiceRef = useRef(null);

  const addItem = () => {
    setItems([...items, { id: Date.now(), particulars: '', rate: 0, quantity: 1, unit: 'students' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const calculateSubTotal = () => {
    return items.reduce((total, item) => total + (Number(item.rate) * Number(item.quantity)), 0);
  };

  const generatePDF = async () => {
    const element = invoiceRef.current;
    if (!element) return null;

    try {
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      element.style.width = '210mm';
      element.style.maxWidth = 'none';

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });

      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const finalPdfHeight = canvas.height * ratio;
      
      const marginX = (pdfWidth - imgWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', marginX, 0, imgWidth, finalPdfHeight);
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || error}`);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save(`Invoice_${date}.pdf`);
    }
  };

  const handlePrint = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    }
  };

  const totalAmount = calculateSubTotal();
  const inr = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const displayDate = (() => {
    const [y, m, d] = (date || '').split('-');
    return y ? `${d}/${m}/${y}` : '';
  })();
  const toLines = toAddress.split('\n').filter(l => l.trim());

  const inputCls = 'w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm';
  const cell = { border: '1px solid #b8b8b8', padding: '6px 10px', fontSize: '13px' };
  const th = { ...cell, background: '#e7e7e7', fontWeight: 700 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-[#2563eb]" /> Invoice Generator
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-[#ffffff] font-semibold rounded-lg transition-colors shadow-md"
          >
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Editor Form */}
        <div className="bg-[#ffffff] p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-4 border-b pb-2">Invoice Details</h3>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Invoice No</label>
                <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#334155] mb-1">To (one line per row)</label>
              <textarea
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder={'College / Company Name\nCity'}
                className={inputCls + ' min-h-[90px]'}
              />
            </div>
            <p className="text-xs text-[#64748b]">The From address, bank details, GST note and signature are fixed and appear on every invoice.</p>
          </div>

          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold text-[#1e293b]">Items</h3>
            <button onClick={addItem} className="flex items-center gap-1 text-sm text-[#2563eb] hover:text-blue-700 font-medium">
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-2 items-start bg-[#f8fafc] p-3 rounded-lg border border-[#f1f5f9] relative group">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Description (e.g. GATE test series, CHEMICAL DEPARTMENT)"
                    value={item.particulars}
                    onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <div className="w-20">
                      <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase">Qty</label>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} className={inputCls} />
                    </div>
                    <div className="w-28">
                      <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase">Unit</label>
                      <input type="text" value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase">Rate (₹)</label>
                      <input type="number" min="0" value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)} className={inputCls} />
                    </div>
                    <div className="w-28 bg-[#ffffff] border border-[#e2e8f0] rounded-lg px-3 py-2 flex items-end justify-end shadow-inner">
                      <span className="text-sm font-bold text-[#334155]">₹{inr(item.rate * item.quantity)}</span>
                    </div>
                  </div>
                </div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)} className="p-2 text-[#f87171] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-colors self-center mt-6">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="bg-[#f1f5f9] p-4 sm:p-8 rounded-2xl overflow-x-auto print:bg-[#ffffff] print:p-0">
          <div
            ref={invoiceRef}
            className="bg-[#ffffff] mx-auto w-full max-w-[210mm] min-h-[297mm] text-black flex flex-col"
            style={{ padding: '48px 44px', fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif', fontSize: '13px', color: '#000' }}
          >
            <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, letterSpacing: '0.5px', paddingBottom: '8px', borderBottom: '2px solid #222', margin: 0 }}>INVOICE</h1>

            <div style={{ marginTop: '18px', display: 'flex', gap: '28px' }}>
              <span><b>Invoice No:</b> {invoiceNo}</span>
              <span><b>Date:</b> {displayDate}</span>
            </div>

            <div style={{ marginTop: '22px', display: 'flex' }}>
              <div style={{ width: '50%', lineHeight: '1.9' }}>
                <div style={{ fontWeight: 700 }}>From:</div>
                {FROM_DETAILS.map((line) => <div key={line}>{line}</div>)}
              </div>
              <div style={{ width: '50%', lineHeight: '1.9' }}>
                <div style={{ fontWeight: 700 }}>To:</div>
                {toLines.length ? toLines.map((line, i) => <div key={i}>{line}</div>) : <div style={{ color: '#b0b0b0' }}>Recipient details</div>}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '40px' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Description</th>
                  <th style={{ ...th, textAlign: 'center', width: '110px' }}>Qty</th>
                  <th style={{ ...th, textAlign: 'right', width: '90px' }}>Rate (₹)</th>
                  <th style={{ ...th, textAlign: 'right', width: '110px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cell}>{item.particulars || '-'}</td>
                    <td style={{ ...cell, textAlign: 'center' }}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{inr(item.rate)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{inr(item.rate * item.quantity)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>Total payable</td>
                  <td style={{ ...cell, textAlign: 'right', fontWeight: 700, background: '#e7e7e7' }}>{inr(totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '14px' }}><b>Amount in words:</b> {amountToWords(totalAmount)}</div>

            <div style={{ marginTop: '26px', fontWeight: 700 }}>Bank details for payment</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
              <tbody>
                {BANK_DETAILS.map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ ...cell, fontWeight: 700, background: '#f2f2f2', width: '28%' }}>{label}</td>
                    <td style={{ ...cell, fontFamily: 'Cambria, Georgia, serif' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '18px', fontStyle: 'italic', fontSize: '12.5px' }}>{GST_NOTE}</div>

            <div style={{ marginTop: 'auto', paddingTop: '40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '24px' }}>
              <img src={stampImg} alt="Academy stamp" style={{ width: '84px', height: '84px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
              <div style={{ width: '150px' }}>
                <div style={{ fontSize: '12.5px', marginBottom: '2px' }}>MS GATE ACADEMY</div>
                <img src={signatureImg} alt="Authorized signature" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} style={{ width: '100px', display: 'block', mixBlendMode: 'multiply', marginBottom: '4px' }} />
                <img src={signatoryImg} alt="Dr. M. Muthu Samy" style={{ width: '150px', display: 'block', mixBlendMode: 'multiply' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
