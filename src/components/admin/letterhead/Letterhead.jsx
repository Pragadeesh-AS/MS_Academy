import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';
import { toCanvas, getFontEmbedCSS } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logoImg from '../../../assets/msgate_logo.png';
import signatureImg from '../../../assets/signature.png';
import stampImg from '../../../assets/stamp.png';

// MS GATE Academy letterhead shared by the Invoice and the Student Welcome Letter: the header
// (logo, name, contacts, branches), the sign-off (stamp, signature, signatory, tagline) and the
// footer wave. Pages are laid out at the exact A4 size (794 x 1123 CSS px at 96 dpi); the preview
// is that page scaled to fit, and the PDF is rendered from it at 4x (about 384 dpi), so the
// download looks exactly like the preview and stays sharp when printed or zoomed.

export const PAGE_W = 794;
export const PAGE_H = 1123;
export const EXPORT_SCALE = 4;

export const NAVY = '#10275a';
export const NAVY_DARK = '#0b1d45';
export const GOLD = '#d4a43a';
export const GOLD_LIGHT = '#f0cf7a';
export const INK = '#13285a';
export const LINE = '#b7c5e2';
export const TINT = '#e9f1fc';

export const SERIF = '"PT Serif", Georgia, "Times New Roman", serif';
export const SCRIPT = '"Great Vibes", "Brush Script MT", cursive';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap';

export const UDYAM_NO = 'TN-03-0337502';
const CONTACTS = [
  { icon: Phone, text: '+91 80120 52331' },
  { icon: Mail, text: 'msamy5031@gmail.com' },
  { icon: Globe, text: 'www.msgateacademy.com' },
];
const BRANCHES = [
  { name: 'OTHAKKALMANDAPAM BRANCH', address: 'Pollachi Main Road, Othakkalmandapam, Coimbatore' },
  { name: 'MALUMICHAMPATTI BRANCH', address: 'MVP Complex, Chettipalayam Road, Malumichampatti' },
];
const FOOTER_TAGS = ['GATE', 'PSUs', 'HIGHER STUDIES', 'RESEARCH CAREER'];

// Base style of an A4 page (soft blue tint top-right and middle-left, like the printed letterhead)
export const pageStyle = {
  position: 'relative', width: PAGE_W, minHeight: PAGE_H, overflow: 'hidden', boxSizing: 'border-box',
  padding: '0 22px 230px', fontFamily: SERIF, color: INK,
  background: 'radial-gradient(ellipse 60% 22% at 92% 4%, rgba(198,216,244,0.55), rgba(255,255,255,0) 70%), radial-gradient(ellipse 50% 18% at 4% 62%, rgba(214,228,248,0.5), rgba(255,255,255,0) 70%), #ffffff',
};

// Props that make an image non-draggable, non-selectable and non-savable from the preview
export const protectedImg = {
  draggable: false,
  onDragStart: (e) => e.preventDefault(),
  onContextMenu: (e) => e.preventDefault()
};
export const protectedImgStyle = { pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' };

// PT Serif + Great Vibes, loaded once
export const useLetterheadFonts = () => {
  useEffect(() => {
    if (document.getElementById('letterhead-fonts')) return;
    const link = document.createElement('link');
    link.id = 'letterhead-fonts';
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }, []);
};

// The stamp and signature scans have white backgrounds; turn white into transparency so they sit
// cleanly on the page (CSS blend modes aren't kept in the exported PDF image)
export const useInkOnly = (src) => {
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

// Gold rule with a fade at the outer end: ———— TEXT ————
export const GoldRule = ({ flip = false, style }) => (
  <div style={{ flex: 1, height: 2, background: `linear-gradient(${flip ? 'to left' : 'to right'}, rgba(212,164,58,0), ${GOLD} 35%)`, ...style }} />
);

// Navy pill with a gold border (branch names, INVOICE, bank details heading)
export const Pill = ({ children, style }) => (
  <div style={{ background: `linear-gradient(180deg, #1a3473, ${NAVY_DARK})`, color: '#fff', border: `2px solid ${GOLD}`, borderRadius: 8, ...style }}>
    {children}
  </div>
);

// UDYAM number, logo + name + contacts, both branches and the navy/gold double rule
export const LetterheadTop = () => (
  <>
    <div style={{ position: 'absolute', top: 18, right: 22, fontSize: 15, color: NAVY, letterSpacing: 0.3 }}>{UDYAM_NO}</div>

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

    <div style={{ marginTop: 14, height: 3, background: NAVY, borderRadius: 2 }} />
    <div style={{ marginTop: 2, height: 1.5, background: GOLD }} />
  </>
);

// "With best wishes, ... Mechanical Engineering"
export const SignatoryLines = ({ scale = 1 }) => {
  const lines = [
    { text: 'With best wishes,', style: { fontSize: 13.5 } },
    { text: 'MS GATE Academy', style: { fontSize: 16, fontWeight: 700, marginTop: 4 } },
    { text: <>Dr. M. MUTHU SAMY <span style={{ fontWeight: 400, fontSize: 12.5 * scale }}>(M.E., Ph.D.)</span></>, style: { fontSize: 14, fontWeight: 700, marginTop: 3 } },
    { text: 'NIT Trichy Alumni', style: { fontSize: 13 } },
    { text: 'Founder & Educator', style: { fontSize: 13 } },
    { text: 'Mechanical Engineering', style: { fontSize: 13 } },
  ];
  return lines.map((line, i) => (
    <div key={i} style={{ color: INK, lineHeight: 1.3, whiteSpace: 'nowrap', ...line.style, fontSize: line.style.fontSize * scale }}>{line.text}</div>
  ));
};

// The stamp and the signature with white removed
export const useSignOffImages = () => ({ stamp: useInkOnly(stampImg), signature: useInkOnly(signatureImg) });

// "Ignite Your Dreams" in script, bottom-right above the wave
export const ScriptTagline = () => (
  <div style={{ position: 'absolute', right: 24, bottom: 124, fontFamily: SCRIPT, fontSize: 35, color: NAVY_DARK, transform: 'rotate(-9deg)', transformOrigin: 'right bottom', whiteSpace: 'nowrap', lineHeight: 1 }}>
    Ignite Your Dreams
    <div style={{ height: 3, marginTop: -6, marginLeft: 26, borderRadius: 3, background: `linear-gradient(90deg, rgba(212,164,58,0), ${GOLD} 30%, ${GOLD_LIGHT})` }} />
  </div>
);

// Navy wave with gold swooshes and the tag line
export const FooterWave = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 210 }}>
    <svg width={PAGE_W} height="210" viewBox="0 0 794 210" style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <linearGradient id="lh-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a87414" />
          <stop offset="0.35" stopColor={GOLD_LIGHT} />
          <stop offset="0.7" stopColor={GOLD} />
          <stop offset="1" stopColor="#f6dc93" />
        </linearGradient>
        <linearGradient id="lh-navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a3a7c" />
          <stop offset="1" stopColor={NAVY_DARK} />
        </linearGradient>
        <linearGradient id="lh-navy-soft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a4f9c" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2a4f9c" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path d="M0 6 C 110 12, 210 60, 320 112 L 320 210 L 0 210 Z" fill="url(#lh-navy-soft)" />
      <path d="M0 24 C 180 46, 300 124, 430 128 C 570 132, 690 112, 794 92 L 794 106 C 690 126, 570 146, 430 144 C 300 142, 170 76, 0 50 Z" fill="url(#lh-gold)" />
      <path d="M0 54 C 170 80, 300 148, 430 150 C 570 152, 690 130, 794 112 L 794 210 L 0 210 Z" fill="url(#lh-navy)" />
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

// The fixed-size A4 page scaled down to fit its column. `pageRef` points at the page itself
// (what the PDF is rendered from); the page can grow taller than A4 if its content needs it.
export const A4Preview = ({ pageRef, children }) => {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(PAGE_H);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const update = () => {
      setScale(Math.min(1, box.clientWidth / PAGE_W));
      setHeight(pageRef.current?.offsetHeight || PAGE_H);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    if (pageRef.current) ro.observe(pageRef.current);
    return () => ro.disconnect();
  }, [pageRef]);
  // Prepare the embedded fonts in the background so the first Download / Send is quick
  useEffect(() => {
    const t = setTimeout(() => warmUpPdfRenderer(pageRef.current), 1500);
    return () => clearTimeout(t);
  }, [pageRef]);
  return (
    <div ref={boxRef} className="w-full">
      <div style={{ width: PAGE_W * scale, height: height * scale, margin: '0 auto', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15,23,42,0.18)' }}>
        <div style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// The web fonts embedded into the rendered page. Building this means downloading and encoding
// the font files, so it's done once (warmed up when a letterhead page opens) and reused.
let fontEmbedCssPromise = null;
const fontEmbedCss = (element) => {
  if (!fontEmbedCssPromise) {
    fontEmbedCssPromise = getFontEmbedCSS(element).catch(err => {
      fontEmbedCssPromise = null; // try again next time
      throw err;
    });
  }
  return fontEmbedCssPromise;
};
export const warmUpPdfRenderer = async (element) => {
  if (!element) return;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await fontEmbedCss(element);
  } catch {
    // the first export will retry
  }
};

// JPEG quality for the page image. At 4x (about 384 dpi) 0.98 is visually identical to PNG,
// and jsPDF embeds a JPEG as-is - a PNG it has to decode and re-compress, which took ~6 s a page.
const PAGE_JPEG_QUALITY = 0.98;

// Render a page element at 4x onto an A4 PDF (a taller page if the content grew)
export const renderPagePdf = async (element) => {
  if (document.fonts?.ready) await document.fonts.ready;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  let canvas;
  try {
    canvas = await toCanvas(element, {
      pixelRatio: EXPORT_SCALE, backgroundColor: '#ffffff', width, height, fontEmbedCSS: await fontEmbedCss(element),
    });
  } catch (err) {
    // Fallback renderer (no web-font embedding, but still high resolution)
    console.warn('html-to-image failed, using html2canvas', err);
    canvas = await html2canvas(element, { scale: EXPORT_SCALE, useCORS: true, backgroundColor: '#ffffff' });
  }
  const imgData = canvas.toDataURL('image/jpeg', PAGE_JPEG_QUALITY);
  const pdfW = 210;
  const pdfH = Math.max(297, (height / width) * pdfW);
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [pdfW, pdfH], compress: true });
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, (height / width) * pdfW, undefined, 'NONE');
  return pdf;
};

// Several A4 page elements as one PDF, one page each (same rendering as renderPagePdf)
export const renderPagesPdf = async (elements, { scale = EXPORT_SCALE } = {}) => {
  if (document.fonts?.ready) await document.fonts.ready;
  let pdf = null;
  for (const element of elements) {
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    let canvas;
    try {
      canvas = await toCanvas(element, {
        pixelRatio: scale, backgroundColor: '#ffffff', width, height, fontEmbedCSS: await fontEmbedCss(element),
      });
    } catch (err) {
      console.warn('html-to-image failed, using html2canvas', err);
      canvas = await html2canvas(element, { scale, useCORS: true, backgroundColor: '#ffffff' });
    }
    const pdfW = 210;
    const pdfH = Math.max(297, (height / width) * pdfW);
    if (!pdf) pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [pdfW, pdfH], compress: true });
    else pdf.addPage([pdfW, pdfH], 'p');
    pdf.addImage(canvas.toDataURL('image/jpeg', PAGE_JPEG_QUALITY), 'JPEG', 0, 0, pdfW, (height / width) * pdfW, undefined, 'NONE');
  }
  return pdf;
};

export const safeFilePart =(s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').trim();
