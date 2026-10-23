import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Lock, FileText, ZoomIn, ZoomOut, ShieldAlert, Crown, ChevronRight, Sparkles, CheckCheck, Star, ShieldCheck, X } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { sameDepartment } from '../utils/subjects';

pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Standard rendered page for full view or free preview pages
const PdfPage = ({ page, scale }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!page || !canvasRef.current) return;
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: canvas.getContext('2d'),
      viewport: viewport,
    };
    
    const renderTask = page.render(renderContext);
    
    renderTask.promise.catch(err => {
      if (err.name !== 'RenderingCancelledException' && err.name !== 'AbortException') {
        console.error('PDF render error:', err);
      }
    });
    
    return () => {
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
  }, [page, scale]);

  return (
    <div className="relative bg-white shadow-xl mb-8 group" onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} className="max-w-full h-auto pointer-events-none select-none"></canvas>
      <div className="absolute inset-0 z-10 pointer-events-auto" onContextMenu={(e) => e.preventDefault()}></div>
    </div>
  );
};

// Inclusions helper mirroring Academy Test
const extractBundleInclusions = (bundle) => {
  if (!bundle) return [];
  const features = (bundle.features || [])
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(Boolean);
  if (features.length > 0) return features;

  const perms = bundle.permissions;
  if (Array.isArray(perms) && perms.length > 0) {
    const items = [];
    if (perms.includes('tests')) items.push('Academy Tests');
    if (perms.includes('live_classes')) items.push('Live Classes');
    if (perms.includes('recordings')) items.push('Class Recordings');
    if (perms.includes('notes')) items.push('Study Notes');
    return items;
  }
  return ['Full Study Notes Access', 'Downloadable PDF'];
};

const extractDiscountInfo = (bundle) => {
  const orig = Number(bundle.price);
  const disc = Number(bundle.discountedPrice);
  if (!isNaN(orig) && !isNaN(disc) && orig > disc && disc > 0) {
    const diff = orig - disc;
    const pct = Math.round((diff / orig) * 100);
    return { hasDiscount: true, saveAmount: diff, percent: pct };
  }
  return { hasDiscount: false, saveAmount: 0, percent: 0 };
};

// Blurred continuation page rendered with in-page suggested bundles to purchase
const BlurredLockedPage = ({ 
  page, 
  scale, 
  pageNumber, 
  numPages, 
  suggestedBundles = [], 
  suggestedNoteBundles = [], 
  bundles = [],
  onBuyBundle, 
  onBuyNoteBundle, 
  payingBundleId, 
  onUpgrade,
  note
}) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 750, height: 950 });
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    if (!page) return;
    const viewport = page.getViewport({ scale });
    setDimensions({ 
      width: Math.round(viewport.width), 
      height: Math.round(viewport.height) 
    });

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: canvas.getContext('2d'),
      viewport: viewport,
    };
    
    const renderTask = page.render(renderContext);
    
    renderTask.promise.catch(err => {
      if (err.name !== 'RenderingCancelledException' && err.name !== 'AbortException') {
        console.error('PDF render error:', err);
      }
    });
    
    return () => {
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
  }, [page, scale]);

  const remainingAfterThis = Math.max(0, numPages - pageNumber);
  const noteTitle = note?.title || (note?.subject ? `${note.subject} - STUDY NOTES` : 'STUDY MATERIAL');
  const noteDept = note?.department || 'Mechanical (ME)';

  // Combine only the actual matching suggested bundles (no artificial extra bundles)
  const combinedBundles = [
    ...(suggestedBundles || []),
    ...(suggestedNoteBundles || []).map(nb => ({ ...nb, isNoteBundle: true })),
  ].filter(Boolean);

  let bundlesToDisplay = combinedBundles;

  // Fallback only if no bundles at all were matched
  if (bundlesToDisplay.length === 0) {
    bundlesToDisplay = [
      {
        id: "bundle-elite",
        name: "GATE ELITE COURSE - MECHANICAL",
        department: "MECHANICAL (ME)",
        tagline: "IGNITE YOUR DREAMS",
        price: 90000,
        discountedPrice: 70000,
        permissions: ["tests", "live_classes", "recordings", "notes"],
        isPopular: true,
      },
    ];
  }

  return (
    <div 
      className="relative bg-white shadow-2xl mb-12 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-blue-200/90 mx-auto w-full"
      style={{ 
        width: dimensions.width ? `${dimensions.width}px` : '100%', 
        minHeight: dimensions.height ? `${dimensions.height}px` : '650px',
        maxWidth: '100%' 
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Blurred Next Page Canvas in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-slate-100">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-cover filter blur-[7px] opacity-65 scale-105"
        />
        {/* Soft dark frosted tint */}
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />
      </div>

      {/* Page indicator pill */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/85 text-white backdrop-blur-md shadow-lg text-[11px] font-black uppercase tracking-wider">
        <Lock size={12} className="text-amber-400" />
        <span>Page {pageNumber} Locked</span>
      </div>

      {/* Inline banner on blurred page - clean card with only Buy Bundle button */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[580px] p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white/95 rounded-2xl sm:rounded-3xl border-2 border-blue-200 shadow-2xl p-6 sm:p-8 backdrop-blur-xl animate-in zoom-in-95 duration-200 text-center my-auto pointer-events-auto">
          {/* Top accent bar in blue theme */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-t-2xl sm:rounded-t-3xl" />

          {/* Lock icon */}
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock size={30} className="text-blue-600 drop-shadow-sm" />
          </div>

          <span className="inline-block text-[11px] font-[900] tracking-widest uppercase px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            Locked Content
          </span>

          <h3 className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight leading-snug mb-2">
            Unlock the Full Material
          </h3>
          
          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-md mx-auto mb-6">
            You've reached the end of the free preview. {remainingAfterThis > 0 ? (
              <>There are <strong className="text-slate-900 font-bold">{remainingAfterThis} more pages</strong> waiting for you! </>
            ) : null}
            Purchase a course bundle to instantly unlock the entire high-quality document.
          </p>

          {/* ONLY Buy Bundle button in that place */}
          <button
            type="button"
            onClick={() => setShowUnlockModal(true)}
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-[900] text-sm sm:text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] mx-auto"
          >
            <Crown size={18} />
            <span>Buy Bundle</span>
          </button>
        </div>
      </div>

      {/* POPUP MODAL (when Buy Bundle is clicked, styled exactly like Image 2) */}
      {showUnlockModal && createPortal(
        <div 
          className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUnlockModal(false); }}
        >
          <div 
            className={`relative w-full ${
              bundlesToDisplay.length <= 1 
                ? 'max-w-xl' 
                : bundlesToDisplay.length === 2 
                  ? 'max-w-4xl' 
                  : 'max-w-6xl'
            } bg-neutral-100 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] p-6 sm:p-8 border border-neutral-300 animate-in zoom-in-95 duration-200 text-center custom-scrollbar max-h-[92vh] overflow-y-auto my-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowUnlockModal(false)}
              className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-white hover:bg-neutral-200 border border-gray-300 text-gray-700 hover:text-black flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2.5 shadow-sm">
                <Sparkles size={13} className="text-blue-600" />
                <span>UNLOCK MATERIAL ACCESS</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight mb-1 uppercase">
                {noteTitle}
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-lg mx-auto mb-2">
                Unlock this document by choosing a bundle below
              </p>
            </div>

            {/* Bundles Grid - adopts dynamically (1 card centered, 2 cards side-by-side, 3 cards in 3 cols) */}
            <div className={`grid ${
              bundlesToDisplay.length <= 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : bundlesToDisplay.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'
            } gap-5 my-4 text-left`}>
              {bundlesToDisplay.map((bundle) => {
                const finalPrice = Number(bundle.discountedPrice || bundle.price) || 0;
                const { hasDiscount, saveAmount, percent } = extractDiscountInfo(bundle);
                const isPaying = payingBundleId === bundle.id;
                const inclusions = extractBundleInclusions(bundle);
                const tagline = bundle.tagline || bundle.description || "";
                const isPopular = Boolean(
                  bundle.isPopular ||
                  bundle.tier === "elite" ||
                  bundle.isElite ||
                  /elite/i.test(bundle.name || "")
                );

                return (
                  <div
                    key={bundle.id}
                    className={`relative transition-all duration-200 flex flex-col justify-between h-full rounded-2xl bg-white shadow-md hover:shadow-xl p-5 sm:p-6 ${
                      isPopular
                        ? "border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10"
                        : "border-2 border-blue-400/50 hover:border-blue-500"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {bundle.department && (
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                              {bundle.department}
                            </span>
                          )}
                          {isPopular && (
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                              <Star size={10} className="fill-white" /> MOST POPULAR
                            </span>
                          )}
                        </div>

                        {hasDiscount && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {percent}% OFF
                          </span>
                        )}
                      </div>

                      {/* Bundle Name */}
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {bundle.name}
                      </h3>

                      {/* Tagline / Description (e.g. IGNITE YOUR DREAMS) */}
                      {tagline ? (
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
                          {tagline}
                        </p>
                      ) : null}

                      {/* Price with NumberFlow */}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-gray-950 flex items-baseline">
                          ₹<NumberFlow value={finalPrice} />
                        </span>
                        {hasDiscount && (
                          <span className="text-xs sm:text-sm text-gray-400 line-through font-bold">
                            ₹{Number(bundle.price).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {/* Save Amount */}
                      {hasDiscount && (
                        <div className="text-xs font-black text-emerald-600 mt-1">
                          Save ₹{saveAmount.toLocaleString("en-IN")} instantly
                        </div>
                      )}

                      {/* Inclusions List - only the actual inclusions from bundle, no extra words */}
                      {inclusions.length > 0 && (
                        <ul className="space-y-2 font-semibold pt-3.5 mt-3 border-t border-neutral-200 mb-6">
                          {inclusions.map((featureText, idx) => (
                            <li key={idx} className="flex items-center text-gray-800 text-sm">
                              <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-300 flex items-center justify-center mr-2.5 shrink-0">
                                <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                              </span>
                              <span className="font-semibold text-gray-900">{featureText}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* CTA Button: Both cards share the same vibrant blue primary button theme */}
                    <div className="mt-auto pt-2">
                      <button
                        type="button"
                        disabled={isPaying}
                        onClick={() => {
                          setShowUnlockModal(false);
                          if (bundle.isNoteBundle && onBuyNoteBundle) {
                            onBuyNoteBundle(bundle.id);
                          } else if (onBuyBundle) {
                            onBuyBundle(bundle.id);
                          } else if (onUpgrade) {
                            onUpgrade();
                          }
                        }}
                        className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60"
                      >
                        <span>
                          {isPaying
                            ? "Opening Checkout..."
                            : `Buy Bundle • ₹${finalPrice.toLocaleString("en-IN")}`}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs">
              <div className="flex items-center gap-2 text-gray-600 font-medium">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Unlock your learning potential • Instant access upon enrollment</span>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-200"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function PDFViewer({ 
  url, 
  previewLimit = null, 
  note = null,
  bundles = [],
  noteBundles = [],
  department = null,
  onBuyBundle = null,
  onBuyNoteBundle = null,
  payingBundleId = null,
  onUpgrade 
}) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);
  const [blurredPage, setBlurredPage] = useState(null);

  // Compute matching suggested bundles where the notes are available
  const noteBundleIds = note?.bundleAccess?.bundleIds || note?.bundleIds || [];
  
  let suggestedBundles = (bundles || []).filter(b => {
    if (!b || b.isHidden) return false;
    // If note is explicitly assigned to specific bundles:
    if (noteBundleIds.length > 0) {
      return noteBundleIds.includes(b.id);
    }
    // Matching department bundles that include notes (or Elite bundles)
    return (
      (sameDepartment(b.department, department) || b.department === 'General' || b.department === 'All') &&
      (b.tier === 'elite' || b.isElite || /elite/i.test(b.name || '') || !b.permissions || b.permissions.includes('notes'))
    );
  });

  if (suggestedBundles.length === 0) {
    suggestedBundles = (bundles || []).filter(b => 
      b && !b.isHidden && (sameDepartment(b.department, department) || b.department === 'General' || b.department === 'All')
    );
  }

  // Fallback to any Elite bundle if department match yielded none
  if (suggestedBundles.length === 0) {
    suggestedBundles = (bundles || []).filter(b => 
      b && !b.isHidden && (b.tier === 'elite' || b.isElite || /elite/i.test(b.name || ''))
    );
  }

  const suggestedNoteBundles = (noteBundles || []).filter(nb => 
    nb && !nb.isHidden && (sameDepartment(nb.department, department) || nb.department === 'General' || nb.department === 'All')
  );

  useEffect(() => {
    let active = true;
    
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setPages([]);
        setBlurredPage(null);
        
        const loadingTask = pdfjsLib.getDocument(url);
        const loadedPdf = await loadingTask.promise;
        if (!active) return;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
        
        let pagesToRender = loadedPdf.numPages;
        let loadBlurredNext = false;

        // Keep preview pages (e.g. 3 pages) above, and load the 4th page for the blurred form
        if (previewLimit !== null && previewLimit > 0 && loadedPdf.numPages > previewLimit) {
          pagesToRender = previewLimit;
          loadBlurredNext = true;
        }
        
        const pagePromises = [];
        for (let i = 1; i <= pagesToRender; i++) {
          pagePromises.push(loadedPdf.getPage(i));
        }

        if (loadBlurredNext) {
          pagePromises.push(loadedPdf.getPage(previewLimit + 1));
        }
        
        const loadedPages = await Promise.all(pagePromises);
        if (active) {
          if (loadBlurredNext) {
            setPages(loadedPages.slice(0, previewLimit));
            setBlurredPage(loadedPages[previewLimit]);
          } else {
            setPages(loadedPages);
            setBlurredPage(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        // Ignore AbortException which happens during StrictMode unmounts
        if (active && err.name !== 'AbortException') {
          setError("Failed to load PDF. Please check your connection and try again.");
          setLoading(false);
        }
      }
    };
    
    loadPdf();
    
    return () => { active = false; };
  }, [url, previewLimit]);

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

  const isLocked = previewLimit !== null && numPages > previewLimit;

  // ── Anti-Screenshot Protection (PDF only) ──────────────────────
  useEffect(() => {
    const blockContextMenu = (e) => e.preventDefault();
    const blockKeys = (e) => {
      const key = e.key?.toLowerCase();
      if (key === 'printscreen') { e.preventDefault(); navigator.clipboard?.writeText('').catch(() => {}); return false; }
      if (e.shiftKey && e.metaKey && key === 's') { e.preventDefault(); return false; }
      if (e.metaKey && e.shiftKey && ['3','4','5','6'].includes(key)) { e.preventDefault(); return false; }
      if ((e.ctrlKey || e.metaKey) && key === 'p') { e.preventDefault(); return false; }
    };
    const handleVisibility = () => {
      if (document.hidden) document.body.style.filter = 'blur(10px)';
      else document.body.style.filter = '';
    };
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.body.style.filter = '';
    };
  }, []);
  // ────────────────────────────────────────────────────────────────

  const studentName = sessionStorage.getItem('auth_name') || 'Student';

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] relative font-sans select-none">

      {/* ── PDF Watermark ── */}
      <div aria-hidden="true" className="absolute inset-0 z-[9999] pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i % 4) * 28}%`,
            top: `${Math.floor(i / 4) * 22}%`,
            transform: 'rotate(-30deg)',
            opacity: 0.06,
            fontSize: '14px',
            fontWeight: '900',
            color: '#1e3a8a',
            whiteSpace: 'nowrap',
            fontFamily: 'sans-serif',
            pointerEvents: 'none',
          }}>
            MS Academy · {studentName}
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 h-14 bg-white flex items-center justify-between gap-2 px-3 sm:px-6 border-b border-slate-200 z-10 shadow-sm">
        <span className="font-bold text-slate-800 text-[13px] sm:text-[15px] flex items-center gap-2 min-w-0 truncate">
          <FileText size={18} className="text-blue-600 flex-shrink-0" />
          <span className="truncate"><span className="hidden sm:inline">MS Academy </span>Document Viewer</span>
          {isLocked && <span className="ml-1 sm:ml-2 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-[900] flex-shrink-0">Preview ({pages.length} Pages)</span>}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button onClick={zoomOut} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><ZoomOut size={18} /></button>
          <span className="text-sm font-[900] text-slate-500 w-10 sm:w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><ZoomIn size={18} /></button>
        </div>
      </div>
      
      <div className="flex-1 mt-14 overflow-y-auto p-4 md:p-8 flex flex-col items-center select-none bg-slate-200/50">
        
        {loading && (
          <div className="text-slate-500 flex flex-col items-center mt-32">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold">Loading Secure Document...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 mt-20 font-bold bg-red-50 px-6 py-4 rounded-xl flex items-center gap-3">
            <ShieldAlert size={24} /> {error}
          </div>
        )}
        
        {/* Render free preview pages as normal sharp pages */}
        {!loading && !error && pages.map((page, index) => (
          <PdfPage key={index} page={page} scale={scale} />
        ))}

        {/* Instead of plain white card, render next page in blurred form with suggested bundles */}
        {!loading && isLocked && (
          <BlurredLockedPage
            page={blurredPage}
            scale={scale}
            pageNumber={(previewLimit || 0) + 1}
            numPages={numPages}
            suggestedBundles={suggestedBundles}
            suggestedNoteBundles={suggestedNoteBundles}
            onBuyBundle={onBuyBundle}
            onBuyNoteBundle={onBuyNoteBundle}
            payingBundleId={payingBundleId}
            onUpgrade={onUpgrade}
            note={note}
            bundles={bundles}
          />
        )}
      </div>
    </div>
  );
}
