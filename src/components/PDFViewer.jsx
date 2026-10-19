import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Lock, FileText, ZoomIn, ZoomOut, ShieldAlert, Crown, ChevronRight } from 'lucide-react';
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

// Blurred continuation page rendered with in-page suggested bundles to purchase
const BlurredLockedPage = ({ 
  page, 
  scale, 
  pageNumber, 
  numPages, 
  suggestedBundles = [], 
  suggestedNoteBundles = [], 
  onBuyBundle, 
  onBuyNoteBundle, 
  payingBundleId, 
  onUpgrade 
}) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 750, height: 950 });

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

  return (
    <div 
      className="relative bg-white shadow-2xl mb-12 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-200/90 mx-auto w-full"
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

      {/* Suggested Bundles Card in normal document flow over the blur */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[580px] p-4 sm:p-8">
        <div className="w-full max-w-xl bg-white/95 rounded-2xl sm:rounded-3xl border-2 border-amber-200 shadow-2xl p-5 sm:p-7 backdrop-blur-xl animate-in zoom-in-95 duration-200 text-left my-auto pointer-events-auto">
          {/* Top accent bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-t-2xl sm:rounded-t-3xl" />

          {/* Header */}
          <div className="text-center mb-4 pt-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Lock size={28} className="text-amber-600 drop-shadow-sm" />
            </div>

            <span className="inline-block text-[10px] sm:text-[11px] font-[900] tracking-widest uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 mb-1.5">
              Locked Content
            </span>

            <h3 className="text-xl sm:text-2xl font-[900] text-slate-900 tracking-tight leading-snug">
              Unlock the Full Material
            </h3>
            
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-md mx-auto mt-1">
              You've reached the end of the free preview. {remainingAfterThis > 0 ? (
                <>There are <strong className="text-slate-900 font-bold">{remainingAfterThis} more pages</strong> waiting for you!</>
              ) : null} Purchase a bundle below to instantly unlock this entire high-quality document:
            </p>
          </div>

          {/* Suggested Bundles List */}
          <div className="space-y-3 mb-4 max-h-[38vh] overflow-y-auto pr-1">
            {suggestedBundles.filter(Boolean).map(bundle => {
              const isPaying = payingBundleId === bundle.id;
              const price = bundle.discountedPrice || bundle.price;
              const hasDiscount = bundle.discountedPrice && bundle.discountedPrice !== bundle.price;
              return (
                <div 
                  key={bundle.id}
                  className="bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-xl sm:rounded-2xl border-2 border-amber-200/90 p-3.5 sm:p-4 hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {bundle.department || 'All Departments'}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Recommended
                      </span>
                    </div>
                    <h4 className="font-[900] text-slate-900 text-sm sm:text-[15px] leading-tight">
                      {bundle.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Includes full study notes, unlimited tests & live classes
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-[900] text-slate-900">
                        ₹{price}
                      </div>
                      {hasDiscount && (
                        <div className="text-[10px] font-bold text-slate-400 line-through">
                          ₹{bundle.price}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onBuyBundle) onBuyBundle(bundle.id);
                        else if (onUpgrade) onUpgrade();
                      }}
                      disabled={isPaying}
                      className="px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-[900] text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      <Crown size={15} />
                      <span>{isPaying ? 'Opening...' : 'Buy Bundle'}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* If there are specific Notes Bundles (e.g. Civil Full Notes) */}
            {suggestedNoteBundles.filter(Boolean).map(nb => {
              const isPaying = payingBundleId === nb.id;
              const price = nb.discountedPrice || nb.price;
              const hasDiscount = nb.discountedPrice && nb.discountedPrice !== nb.price;
              return (
                <div 
                  key={nb.id}
                  className="bg-indigo-50/50 rounded-xl sm:rounded-2xl border border-indigo-200 p-3.5 sm:p-4 hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Notes Bundle
                      </span>
                    </div>
                    <h4 className="font-[900] text-slate-900 text-sm sm:text-[15px] leading-tight">
                      {nb.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      All subjects study notes for your department
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-[900] text-slate-900">
                        ₹{price}
                      </div>
                      {hasDiscount && (
                        <div className="text-[10px] font-bold text-slate-400 line-through">
                          ₹{nb.price}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onBuyNoteBundle) onBuyNoteBundle(nb.id);
                        else if (onUpgrade) onUpgrade();
                      }}
                      disabled={isPaying}
                      className="px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-[900] text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      <FileText size={15} />
                      <span>{isPaying ? 'Opening...' : 'Buy Notes'}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {suggestedBundles.length === 0 && suggestedNoteBundles.length === 0 && (
              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-[900] text-sm shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Crown size={16} /> Upgrade to Pro
                </button>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            {onUpgrade && (
              <button
                type="button"
                onClick={onUpgrade}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Explore all course bundles</span>
                <ChevronRight size={13} />
              </button>
            )}
            {remainingAfterThis > 0 && (
              <span className="text-slate-400 font-bold ml-auto text-[11px]">
                +{remainingAfterThis} more pages locked
              </span>
            )}
          </div>
        </div>
      </div>
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
          />
        )}
      </div>
    </div>
  );
}
