import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Download, Plus, Trash2, Printer, FileText, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logoImg from '../../assets/msgate_logo.png';
import signatureImg from '../../assets/signature.png';
import stampImg from '../../assets/stamp.png';

// ---------------------------------------------------------------- fixed details
// These appear on every invoice and are not editable
const UDYAM_NO = 'UDYAM-TN-03-0337502';
const CONTACTS = [
  { icon: Phone, text: '+91 80120 52331' },
  { icon: Mail, text: 'msamy5031@gmail.com' },
  { icon: Globe, text: 'www.msgateacademy.com' },
];
const BRANCHES = [
  { name: 'OTHAKKALMANDAPAM BRANCH', address: 'Pollachi Main Road, Othakkalmandapam, Coimbatore' },
  { name: 'MALUMICHAMPATTI BRANCH', address: 'Pollachi Main Road, Malumichampatti, Coimbatore' },
];
const FROM_DETAILS = ['MS GATE ACADEMY', 'COIMBATORE'];
const BANK_DETAILS = [
  ['Account name', 'MUTHU SAMY M'],
  ['Account number', '34003918492'],
  ['IFSC', 'SBIN0015017'],
  ['Bank & branch', 'STATE BANK OF INDIA,\nMALUMICHAMPATTI'],
  ['PAN', 'CTFPM7085P'],
];
const GST_NOTE = 'Supplier is not registered under GST. No GST charged.';
const SIGNATORY = [
  { text: 'With best wishes,', style: { fontSize: 13.5 } },
  { text: 'MS GATE Academy', style: { fontSize: 16, fontWeight: 700, marginTop: 4 } },
  { text: <>Dr. M. MUTHU SAMY <span style={{ fontWeight: 400, fontSize: 12.5 }}>(M.E., Ph.D.)</span></>, style: { fontSize: 14, fontWeight: 700, marginTop: 3 } },
  { text: 'NIT Trichy Alumni', style: { fontSize: 13 } },
  { text: 'Founder & Educator', style: { fontSize: 13 } },
  { text: 'Mechanical Engineering', style: { fontSize: 13 } },
];
const FOOTER_TAGS = ['GATE', 'PSUs', 'HIGHER STUDIES', 'RESEARCH CAREER'];

// ---------------------------------------------------------------- page design
// The invoice is laid out at the exact A4 size (794 x 1123 CSS px at 96 dpi). The preview is
// that same page scaled to fit, and the PDF is rendered from it at 4x (about 384 dpi), so the
// download looks exactly like the preview and stays sharp when printed or zoomed.
const PAGE_W = 794;
const PAGE_H = 1123;
const EXPORT_SCALE = 4;

const NAVY = '#10275a';
const NAVY_DARK = '#0b1d45';
const GOLD = '#d4a43a';
const GOLD_LIGHT = '#f0cf7a';
const INK = '#13285a';
const LINE = '#b7c5e2';
const TINT = '#e9f1fc';

const SERIF = '"PT Serif", Georgia, "Times New Roman", serif';
const SCRIPT = '"Great Vibes", "Brush Script MT", cursive';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap';

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

// Props that make an image non-draggable, non-selectable and non-savable from the preview
const protectedImg = {
  draggable: false,
  onDragStart: (e) => e.preventDefault(),
  onContextMenu: (e) => e.preventDefault()
};
const protectedImgStyle = { pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' };

// The stamp and signature scans have white backgrounds; turn white into transparency so they sit
// cleanly on the page (CSS blend modes aren't kept in the exported PDF image)
const useInkOnly = (src) => {
  const [url, setUrl] = useState(src);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const light = Math.min(px[i], px[i + 1], px[i + 2]);
          // Fully clear above 235, fade out between 170 and 235 so edges stay smooth
          if (light >= 235) px[i + 3] = 0;
          else if (light > 170) px[i + 3] = Math.round(px[i + 3] * (235 - light) / 65);
        }
        ctx.putImageData(data, 0, 0);
        if (!cancelled) setUrl(c.toDataURL('image/png'));
      } catch {
        // keep the original image
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return url;
};

// Rupee sign: the serif font has no ₹ glyph, so draw it in a font that does
const Rs = () => <span style={{ fontFamily: '"Segoe UI", "Noto Sans", Arial, sans-serif' }}>₹</span>;

// Gold rule with a fade at the outer end: ———— TEXT ————
const GoldRule = ({ flip = false, style }) => (
  <div style={{ flex: 1, height: 2, background: `linear-gradient(${flip ? 'to left' : 'to right'}, rgba(212,164,58,0), ${GOLD} 35%)`, ...style }} />
);

// Navy pill with a gold border, used for the branch names and the invoice / bank headings
const Pill = ({ children, style }) => (
  <div style={{ background: `linear-gradient(180deg, #1a3473, ${NAVY_DARK})`, color: '#fff', border: `2px solid ${GOLD}`, borderRadius: 8, ...style }}>
    {children}
  </div>
);

// Footer: navy wave with gold swooshes and the tag line
const FooterWave = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 210 }}>
    <svg width={PAGE_W} height="210" viewBox="0 0 794 210" style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <linearGradient id="inv-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a87414" />
          <stop offset="0.35" stopColor={GOLD_LIGHT} />
          <stop offset="0.7" stopColor={GOLD} />
          <stop offset="1" stopColor="#f6dc93" />
        </linearGradient>
        <linearGradient id="inv-navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a3a7c" />
          <stop offset="1" stopColor={NAVY_DARK} />
        </linearGradient>
        <linearGradient id="inv-navy-soft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a4f9c" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2a4f9c" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* back wave (left) */}
      <path d="M0 6 C 110 12, 210 60, 320 112 L 320 210 L 0 210 Z" fill="url(#inv-navy-soft)" />
      {/* gold swoosh from the left */}
      <path d="M0 24 C 180 46, 300 124, 430 128 C 570 132, 690 112, 794 92 L 794 106 C 690 126, 570 146, 430 144 C 300 142, 170 76, 0 50 Z" fill="url(#inv-gold)" />
      {/* main navy wave */}
      <path d="M0 54 C 170 80, 300 148, 430 150 C 570 152, 690 130, 794 112 L 794 210 L 0 210 Z" fill="url(#inv-navy)" />
      {/* thin gold highlight on the right */}
      <path d="M480 136 C 610 134, 705 112, 794 80 L 794 86 C 705 120, 610 142, 480 141 Z" fill={GOLD_LIGHT} opacity="0.9" />
    </svg>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, color: '#fff', fontFamily: SERIF, fontSize: 16.5, letterSpacing: 4.5 }}>
      {FOOTER_TAGS.map((tag, i) => (
        <React.Fragment key={tag}>
          {i > 0 && <span style={{ width: 2, height: 20, background: GOLD, display: 'inline-block' }} />}
          <span>{tag}</span>
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default function InvoiceGenerator() {
  const [toAddress, setToAddress] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('GATE TEST SERIES - 001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ id: 1, particulars: '', rate: 0, quantity: 1, unit: 'students' }]);
  const [busy, setBusy] = useState(false);
  const stampSrc = useInkOnly(stampImg);
  const signatureSrc = useInkOnly(signatureImg);
  const invoiceRef = useRef(null);
  const previewBoxRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(PAGE_H); // grows past A4 only when many items are added

  // The invoice's fonts (PT Serif + Great Vibes), loaded once for this page
  useEffect(() => {
    if (document.getElementById('invoice-fonts')) return;
    const link = document.createElement('link');
    link.id = 'invoice-fonts';
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }, []);

  // Scale the fixed-size A4 page down to fit the preview column
  useLayoutEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return undefined;
    const fit = () => setPreviewScale(Math.min(1, box.clientWidth / PAGE_W));
    fit();
    const measure = () => setPageHeight(invoiceRef.current?.offsetHeight || PAGE_H);
    measure();
    const ro = new ResizeObserver(() => { fit(); measure(); });
    ro.observe(box);
    if (invoiceRef.current) ro.observe(invoiceRef.current);
    return () => ro.disconnect();
  }, []);

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

  // Render the A4 page at 4x and place it on an A4 PDF page (taller if many items made it grow)
  const generatePDF = async () => {
    const element = invoiceRef.current;
    if (!element) return null;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      let imgData;
      try {
        imgData = await toPng(element, { pixelRatio: EXPORT_SCALE, cacheBust: true, backgroundColor: '#ffffff', width, height });
      } catch (err) {
        // Fallback renderer (no web-font embedding, but still high resolution)
        console.warn('html-to-image failed, using html2canvas', err);
        const canvas = await html2canvas(element, { scale: EXPORT_SCALE, useCORS: true, backgroundColor: '#ffffff' });
        imgData = canvas.toDataURL('image/png');
      }
      const pdfW = 210;
      const pdfH = Math.max(297, (height / width) * pdfW);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [pdfW, pdfH], compress: true });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, (height / width) * pdfW, undefined, 'SLOW');
      return pdf;
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
    if (pdf) pdf.save(`Invoice_${(invoiceNo || 'MS-GATE').replace(/[\\/:*?"<>|]+/g, '').trim()}_${date}.pdf`);
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
          <div ref={previewBoxRef} className="w-full">
            <div style={{ width: PAGE_W * previewScale, height: pageHeight * previewScale, margin: '0 auto', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15,23,42,0.18)' }}>
              <div style={{ width: PAGE_W, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                <div
                  ref={invoiceRef}
                  style={{
                    position: 'relative', width: PAGE_W, minHeight: PAGE_H, overflow: 'hidden', boxSizing: 'border-box',
                    padding: '0 22px 230px', fontFamily: SERIF, color: INK,
                    background: `radial-gradient(ellipse 60% 22% at 92% 4%, rgba(198,216,244,0.55), rgba(255,255,255,0) 70%), radial-gradient(ellipse 50% 18% at 4% 62%, rgba(214,228,248,0.5), rgba(255,255,255,0) 70%), #ffffff`,
                  }}
                >
                  {/* UDYAM registration */}
                  <div style={{ position: 'absolute', top: 18, right: 22, fontSize: 15, color: NAVY, letterSpacing: 0.3 }}>{UDYAM_NO}</div>

                  {/* ---------- Letterhead */}
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 26, height: 156, marginLeft: -6 }}>
                    <img src={logoImg} alt="MS GATE Academy" {...protectedImg} style={{ ...protectedImgStyle, width: 196, height: 152, objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ width: 362, flexShrink: 0, textAlign: 'center', marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ fontSize: 47, fontWeight: 700, color: NAVY, lineHeight: 1, whiteSpace: 'nowrap', transform: 'scaleX(0.79)', transformOrigin: 'center', display: 'inline-block' }}>MS GATE ACADEMY</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 8px' }}>
                        <GoldRule />
                        <span style={{ fontSize: 16.5, letterSpacing: 4.4, color: NAVY, whiteSpace: 'nowrap' }}>IGNITE YOUR DREAMS</span>
                        <GoldRule flip />
                      </div>
                      <div style={{ fontSize: 15.5, color: '#1d3b86', whiteSpace: 'nowrap' }}>GATE Coaching | Test Series | Academic Training</div>
                    </div>
                    <div style={{ width: 2.5, height: 100, background: NAVY, margin: '0 9px 0 9px', alignSelf: 'center', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10, flexShrink: 0 }}>
                      {CONTACTS.map(({ icon: Icon, text }) => (
                        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 25, height: 25, borderRadius: '50%', background: NAVY, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={13} color={GOLD_LIGHT} strokeWidth={2.4} />
                          </span>
                          <span style={{ fontSize: 13.5, color: NAVY, whiteSpace: 'nowrap', letterSpacing: -0.2 }}>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ---------- Branches */}
                  <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 20 }}>
                    {BRANCHES.map((b, i) => (
                      <React.Fragment key={b.name}>
                        {i > 0 && <div style={{ width: 2, background: `linear-gradient(${GOLD}, rgba(212,164,58,0.3))`, margin: '0 14px' }} />}
                        <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'flex-start', paddingLeft: i === 0 ? 14 : 0 }}>
                          <span style={{ width: 27, height: 27, borderRadius: '50%', background: `linear-gradient(${GOLD_LIGHT}, ${GOLD})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            <MapPin size={15} color="#fff" strokeWidth={2.4} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Pill style={{ padding: '4px 10px', textAlign: 'center', fontSize: 12, letterSpacing: 2.6, fontWeight: 700 }}>{b.name}</Pill>
                            <div style={{ fontSize: 12.5, marginTop: 6, whiteSpace: 'nowrap', color: INK }}>{b.address}</div>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* ---------- Double rule */}
                  <div style={{ marginTop: 14, height: 3, background: NAVY, borderRadius: 2 }} />
                  <div style={{ marginTop: 2, height: 1.5, background: GOLD }} />

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
                      {SIGNATORY.map((line, i) => (
                        <div key={i} style={{ color: INK, lineHeight: 1.3, whiteSpace: 'nowrap', ...line.style }}>{line.text}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: 24, bottom: 124, fontFamily: SCRIPT, fontSize: 35, color: NAVY_DARK, transform: 'rotate(-9deg)', transformOrigin: 'right bottom', whiteSpace: 'nowrap', lineHeight: 1 }}>
                    Ignite Your Dreams
                    <div style={{ height: 3, marginTop: -6, marginLeft: 26, borderRadius: 3, background: `linear-gradient(90deg, rgba(212,164,58,0), ${GOLD} 30%, ${GOLD_LIGHT})` }} />
                  </div>

                  <FooterWave />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
