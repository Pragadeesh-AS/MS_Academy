import React, { useState, useRef } from 'react';
import { Download, Plus, Trash2, Printer, FileText } from 'lucide-react';
import {
  NAVY_DARK, INK, LINE, TINT, pageStyle, protectedImg, protectedImgStyle,
  useLetterheadFonts, useSignOffImages, GoldRule, Pill, LetterheadTop, SignatoryLines, ScriptTagline,
  FooterWave, A4Preview, renderPagePdf, safeFilePart,
} from './letterhead/Letterhead';

// ---------------------------------------------------------------- fixed details
// These appear on every invoice and are not editable
const FROM_DETAILS = ['MS GATE ACADEMY', 'COIMBATORE'];
const BANK_DETAILS = [
  ['Account name', 'MUTHU SAMY M'],
  ['Account number', '34003918492'],
  ['IFSC', 'SBIN0015017'],
  ['Bank & branch', 'STATE BANK OF INDIA,\nMALUMICHAMPATTI'],
  ['PAN', 'CTFPM7085P'],
];
const GST_NOTE = 'Supplier is not registered under GST. No GST charged.';
// ---------------------------------------------------------------- amount in words
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

// Rupee sign: the serif font has no ₹ glyph, so draw it in a font that does
const Rs = () => <span style={{ fontFamily: '"Segoe UI", "Noto Sans", Arial, sans-serif' }}>₹</span>;

export default function InvoiceGenerator() {
  const [toAddress, setToAddress] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('GATE TEST SERIES - 001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ id: 1, particulars: '', rate: 0, quantity: 1, unit: 'students' }]);
  const [busy, setBusy] = useState(false);
  const { stamp: stampSrc, signature: signatureSrc } = useSignOffImages();
  const invoiceRef = useRef(null);
  useLetterheadFonts();

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

  const calculateSubTotal = () => items.reduce((total, item) => total + (Number(item.rate) * Number(item.quantity)), 0);

  // The A4 page rendered at 4x (a taller page if many items made it grow)
  const generatePDF = async () => {
    const element = invoiceRef.current;
    if (!element) return null;
    try {
      return await renderPagePdf(element);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || error}`);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    setBusy(true);
    const pdf = await generatePDF();
    setBusy(false);
    if (pdf) pdf.save(`Invoice_${safeFilePart(invoiceNo) || 'MS-GATE'}_${date}.pdf`);
  };

  const handlePrint = async () => {
    setBusy(true);
    const pdf = await generatePDF();
    setBusy(false);
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

  // Table cell styles
  const td = { borderLeft: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: '9px 14px', fontSize: 15.5, color: INK };
  const th = { padding: '7px 14px', fontSize: 16.5, fontWeight: 400, color: '#fff', borderLeft: '1px solid rgba(255,255,255,0.35)' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-[#2563eb]" /> Invoice Generator
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 text-[#ffffff] font-semibold rounded-lg transition-colors shadow-md"
          >
            <Download size={18} /> {busy ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-8 items-start">
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
            <p className="text-xs text-[#64748b]">The letterhead, From address, bank details, GST note, stamp and signature are fixed and appear on every invoice.</p>
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

        {/* Invoice Preview - the exact A4 page, scaled to fit */}
        <div className="bg-[#e2e8f0] p-3 sm:p-6 rounded-2xl">
          <A4Preview pageRef={invoiceRef}>
                <div ref={invoiceRef} style={pageStyle}>
                  <LetterheadTop />

                  {/* ---------- INVOICE title */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, padding: '0 80px' }}>
                    <GoldRule />
                    <Pill style={{ padding: '2px 38px 4px', fontSize: 25, fontWeight: 700, letterSpacing: 1 }}>INVOICE</Pill>
                    <GoldRule flip />
                  </div>

                  {/* ---------- Invoice no / date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 16.5, padding: '0 0 0 0' }}>
                    <span><b>Invoice No.:</b>&nbsp; {invoiceNo}</span>
                    <span><b>Date:</b> {displayDate}</span>
                  </div>

                  {/* ---------- From / To */}
                  <div style={{ display: 'flex', marginTop: 10, fontSize: 16, lineHeight: 1.35 }}>
                    <div style={{ width: '52%' }}>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>From:</div>
                      {FROM_DETAILS.map(line => <div key={line}>{line}</div>)}
                    </div>
                    <div style={{ width: '48%' }}>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>To:</div>
                      {toLines.length ? toLines.map((line, i) => <div key={i}>{line}</div>) : <div style={{ color: '#a7b3cc' }}>Recipient details</div>}
                    </div>
                  </div>

                  {/* ---------- Items table */}
                  <div style={{ marginTop: 12, border: `1.5px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 124 }} />
                        <col style={{ width: 134 }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: `linear-gradient(180deg, #1b3678, ${NAVY_DARK})` }}>
                          <th style={{ ...th, textAlign: 'left', borderLeft: 'none' }}>Description</th>
                          <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                          <th style={{ ...th, textAlign: 'center' }}>Rate (<Rs />)</th>
                          <th style={{ ...th, textAlign: 'center' }}>Amount (<Rs />)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td style={{ ...td, borderLeft: 'none', wordBreak: 'break-word' }}>{item.particulars || '-'}</td>
                            <td style={{ ...td, textAlign: 'center' }}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{inr(item.rate)}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{inr(item.rate * item.quantity)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} style={{ ...td, borderLeft: 'none', borderBottom: 'none', textAlign: 'right', fontWeight: 700, fontSize: 17, padding: '7px 14px' }}>Total payable</td>
                          <td style={{ ...td, borderBottom: 'none', textAlign: 'right', fontWeight: 700, fontSize: 17, padding: '7px 14px', background: TINT }}>{inr(totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ---------- Amount in words */}
                  <div style={{ marginTop: 12, fontSize: 16 }}>
                    <b>Amount in words:</b>&nbsp; {amountToWords(totalAmount)}
                  </div>

                  {/* ---------- Bank details */}
                  <div style={{ width: '71%', marginTop: 14 }}>
                    <Pill style={{ padding: '3px 20px', fontSize: 16.5, borderRadius: '9px 9px 0 0', borderBottomWidth: 3 }}>Bank details for payment</Pill>
                    <table style={{ width: 'calc(100% - 4px)', margin: '0 2px', borderCollapse: 'collapse', border: `1.5px solid ${LINE}`, tableLayout: 'fixed' }}>
                      <colgroup><col style={{ width: '38%' }} /><col /></colgroup>
                      <tbody>
                        {BANK_DETAILS.map(([label, value]) => (
                          <tr key={label}>
                            <td style={{ border: `1px solid ${LINE}`, padding: '3px 18px', fontWeight: 700, fontSize: 15, lineHeight: 1.4, background: `linear-gradient(90deg, #e3edfb, #f1f6fd)`, verticalAlign: 'top' }}>{label}</td>
                            <td style={{ border: `1px solid ${LINE}`, padding: '3px 12px', fontSize: 15, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ---------- GST note */}
                  <div style={{ marginTop: 10, fontStyle: 'italic', fontSize: 14.5, color: '#2a3f7a' }}>{GST_NOTE}</div>

                  {/* ---------- Stamp + signature (sits just above the footer wave) */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, height: 200, pointerEvents: 'none' }}>
                    <img src={stampSrc} alt="Academy stamp" {...protectedImg} style={{ ...protectedImgStyle, position: 'absolute', left: 272, bottom: -6, width: 126, height: 126, objectFit: 'contain' }} />
                    <div style={{ position: 'absolute', left: 558, bottom: 6, width: 226 }}>
                      <img src={signatureSrc} alt="Authorized signature" {...protectedImg} style={{ ...protectedImgStyle, width: 100, display: 'block', margin: '0 0 0 6px' }} />
                      <SignatoryLines />
                    </div>
                  </div>
                  <ScriptTagline />

                  <FooterWave />
                </div>
          </A4Preview>
        </div>
      </div>
    </div>
  );
}
