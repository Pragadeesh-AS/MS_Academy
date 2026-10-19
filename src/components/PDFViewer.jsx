import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { 
  Lock, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  ShieldAlert, 
  Crown, 
  CheckCircle2, 
  ChevronRight, 
  X 
} from 'lucide-react';
import { sameDepartment } from '../utils/subjects';

pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Standard rendered page for full view or free first page
const PdfPage = ({ page, scale, pageNumber = 1 }) => {
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
        renderTask.cancel();
      }
    };
  }, [page, scale]);

  return (
    <div className="relative bg-white shadow-xl mb-8 group rounded-xl overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} className="max-w-full h-auto pointer-events-none select-none block mx-auto"></canvas>
      <div className="absolute inset-0 z-10 pointer-events-auto" onContextMenu={(e) => e.preventDefault()}></div>
      <div className="absolute bottom-2 right-3 z-10 pointer-events-none bg-black/40 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2 py-0.5 rounded-md">
        Page {pageNumber}
      </div>
    </div>
  );
};

// Locked continuation page: Starting lines visible at top, continuation blurred with frosted lock overlay
const LockedPdfPage = ({ 
  page, 
  scale, 
  totalRemainingPages = 0, 
  onUpgrade, 
  eliteBundle = null,
  onBuyBundle = null,
  payingBundleId = null,
  department = null,
  numPages = 1,
  isSinglePage = false,
  pageNumber = 2
}) => {
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
        renderTask.cancel();
      }
    };
  }, [page, scale]);

  // For 1-page document: top ~11% is visible, continuation blurred
  // For multi-page document: top ~14% is visible, continuation blurred
  const visibleTopPct = isSinglePage ? '11%' : '14%';

  return (
    <div 
      className="relative bg-white shadow-2xl mb-6 group rounded-2xl overflow-hidden border border-slate-200/90 w-full"
      style={{ maxWidth: '100%' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Real canvas rendered underneath */}
      <canvas ref={canvasRef} className="max-w-full h-auto pointer-events-none select-none block mx-auto"></canvas>

      {/* Top pill badge */}
      <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md shadow-md text-[11px] font-black uppercase tracking-wider">
        <FileText size={12} className="text-amber-400" />
        <span>Page {pageNumber} Continuation</span>
      </div>

      {/* Transparent safety shield over the clear top portion to prevent text selection / dragging */}
      <div 
        className="absolute inset-x-0 top-0 z-10 pointer-events-auto" 
        style={{ height: visibleTopPct }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Blurred continuation layer with frosted glass & lock card */}
      <div 
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center justify-center p-3 sm:p-6 text-center select-none overflow-y-auto"
        style={{
          top: visibleTopPct,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.85) 15%, rgba(255,255,255,0.96) 32%, rgba(255,255,255,0.99) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="w-full max-w-lg bg-white/95 rounded-2xl sm:rounded-3xl border-2 border-amber-200/90 shadow-2xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200 pointer-events-auto my-auto text-left">
          {/* Accent top stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />

          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Lock size={28} className="text-amber-600 drop-shadow-sm" />
            </div>

            <span className="inline-block text-[10px] sm:text-[11px] font-[900] tracking-widest uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 mb-2">
              Locked Content
            </span>

            <h3 className="text-xl sm:text-2xl font-[900] text-slate-900 tracking-tight leading-snug mb-1.5">
              Do you want to continue reading?
            </h3>
            
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-md mx-auto mb-4">
              Enroll in our Elite courses to get full access to all study notes, complete formulas, full mock tests, and live lectures!
            </p>
          </div>

          {/* Elite Course Bundle Card */}
          {eliteBundle ? (
            <div className="bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-xl sm:rounded-2xl border border-amber-200/80 p-3.5 sm:p-4 mb-4 text-left">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {eliteBundle.department || department || 'GATE Full Course'}
                  </span>
                  <h4 className="font-[900] text-slate-900 text-sm sm:text-base truncate mt-1">
                    {eliteBundle.name}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg sm:text-xl font-[900] text-slate-900">
                    ₹{eliteBundle.discountedPrice || eliteBundle.price}
                  </div>
                  {eliteBundle.discountedPrice && eliteBundle.discountedPrice !== eliteBundle.price && (
                    <div className="text-[11px] font-bold text-slate-400 line-through">₹{eliteBundle.price}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-600 mb-3 pt-2 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">All Subject Study Notes</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">Unlimited Practice Tests</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">Live & Recorded Classes</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">Full Mock Exam Series</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onBuyBundle && eliteBundle) {
                    onBuyBundle(eliteBundle.id);
                  } else if (onUpgrade) {
                    onUpgrade();
                  }
                }}
                disabled={payingBundleId === eliteBundle.id}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-[900] text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
              >
                <Crown size={16} />
                <span>
                  {payingBundleId === eliteBundle.id
                    ? 'Opening Checkout...'
                    : `Enroll in Elite Course • ₹${eliteBundle.discountedPrice || eliteBundle.price}`}
                </span>
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <button
                type="button"
                onClick={onUpgrade}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-[900] text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown size={16} />
                <span>Upgrade to Unlock All Study Notes</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            {onUpgrade && (
              <button
                type="button"
                onClick={onUpgrade}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <span>View all course bundles</span>
                <ChevronRight size={13} />
              </button>
            )}
            {totalRemainingPages > 0 && (
              <span className="text-slate-400 font-bold ml-auto">
                + {totalRemainingPages} more pages locked
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
  isLocked = false, 
  note = null,
  bundles = [],
  department = null,
  onBuyBundle = null,
  payingBundleId = null,
  onUpgrade,
  onClose
}) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);

  // Resolve whether user is locked (free preview)
  const effectiveLocked = isLocked || (previewLimit !== null && previewLimit > 0);

  // Match the specific department's Elite bundle (or general Elite bundle)
  const eliteBundle = bundles.find(b => 
    (b.tier === 'elite' || b.isElite || /elite/i.test(b.name || '')) &&
    (sameDepartment(b.department, department) || b.department === 'General' || b.department === 'All')
  ) || bundles.find(b => b.tier === 'elite' || b.isElite || /elite/i.test(b.name || ''));

  useEffect(() => {
    let active = true;
    
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setPages([]);
        
        const loadingTask = pdfjsLib.getDocument(url);
        const loadedPdf = await loadingTask.promise;
        if (!active) return;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
        
        // For free locked preview:
        // - If 1 page doc: render 1 page (and apply lock overlay to page 1)
        // - If >= 2 page doc: render 2 pages (page 1 free & sharp, page 2 locked continuation)
        let pagesToRender = loadedPdf.numPages;
        if (effectiveLocked) {
          pagesToRender = Math.min(loadedPdf.numPages, 2);
        }
        
        const pagePromises = [];
        for (let i = 1; i <= pagesToRender; i++) {
          pagePromises.push(loadedPdf.getPage(i));
        }
        
        const loadedPages = await Promise.all(pagePromises);
        if (active) {
          setPages(loadedPages);
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
  }, [url, effectiveLocked]);

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

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

      {/* ── Header Toolbar ── */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white flex items-center justify-between gap-2 px-3 sm:px-6 border-b border-slate-200 z-10 shadow-sm">
        <span className="font-bold text-slate-800 text-[13px] sm:text-[15px] flex items-center gap-2 min-w-0 truncate">
          <FileText size={18} className="text-blue-600 flex-shrink-0" />
          <span className="truncate">
            {note?.title ? note.title : 'Study Note Document'}
          </span>
          {effectiveLocked ? (
            <span className="ml-1 sm:ml-2 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-[900] flex-shrink-0 border border-amber-200">
              Preview ({pages.length} of {numPages} {numPages === 1 ? 'Page' : 'Pages'})
            </span>
          ) : (
            <span className="ml-1 sm:ml-2 text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-[900] flex-shrink-0 border border-emerald-200">
              {numPages} {numPages === 1 ? 'Page' : 'Pages'}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button onClick={zoomOut} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Zoom Out"><ZoomOut size={18} /></button>
          <span className="text-sm font-[900] text-slate-500 w-10 sm:w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Zoom In"><ZoomIn size={18} /></button>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 ml-1 sm:ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
      
      {/* ── Document Page Stream ── */}
      <div className="flex-1 mt-14 overflow-y-auto p-4 md:p-8 flex flex-col items-center select-none bg-slate-200/50">
        
        {loading && (
          <div className="text-slate-500 flex flex-col items-center mt-32">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold">Loading Secure Document...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 mt-20 font-bold bg-red-50 px-6 py-4 rounded-xl flex items-center gap-3 border border-red-200">
            <ShieldAlert size={24} /> {error}
          </div>
        )}
        
        {!loading && !error && pages.map((page, index) => {
          const pageNum = index + 1;
          const isThisPageLocked = effectiveLocked && (
            (numPages === 1 && pageNum === 1) || (numPages > 1 && pageNum === 2)
          );

          if (isThisPageLocked) {
            const totalRemaining = Math.max(0, numPages - 2);
            return (
              <React.Fragment key={index}>
                <LockedPdfPage
                  page={page}
                  scale={scale}
                  pageNumber={pageNum}
                  numPages={numPages}
                  isSinglePage={numPages === 1}
                  totalRemainingPages={totalRemaining}
                  eliteBundle={eliteBundle}
                  onBuyBundle={onBuyBundle}
                  payingBundleId={payingBundleId}
                  department={department}
                  onUpgrade={onUpgrade}
                />

                {/* Remaining locked pages pill summary */}
                {totalRemaining > 0 && (
                  <div className="w-full max-w-xl bg-white/90 backdrop-blur-md rounded-2xl border border-amber-200/90 p-4 text-center shadow-lg flex items-center justify-between gap-3 mb-8">
                    <div className="flex items-center gap-3 text-left min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Lock size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-[900] text-slate-800">
                          {totalRemaining} more page{totalRemaining === 1 ? '' : 's'} locked
                        </div>
                        <div className="text-xs text-slate-500 font-medium truncate">
                          Enroll in Elite to unlock all formulas, diagrams & solutions
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (eliteBundle && onBuyBundle) {
                          onBuyBundle(eliteBundle.id);
                        } else if (onUpgrade) {
                          onUpgrade();
                        }
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-[900] text-xs rounded-xl shadow-md shadow-amber-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 transition-all"
                    >
                      <Crown size={14} /> <span>Unlock</span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          }

          return (
            <PdfPage 
              key={index} 
              page={page} 
              scale={scale} 
              pageNumber={pageNum} 
            />
          );
        })}

      </div>
    </div>
  );
}
