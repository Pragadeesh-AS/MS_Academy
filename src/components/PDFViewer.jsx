import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Lock, FileText, ZoomIn, ZoomOut, ShieldAlert } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
    
    // Check if there is an ongoing render task, we shouldn't overlap them, 
    // but React 18 strict mode might double mount.
    const renderTask = page.render(renderContext);
    
    // Handle render errors (including cancellation)
    renderTask.promise.catch(err => {
      if (err.name !== 'RenderingCancelledException' && err.name !== 'AbortException') {
        console.error('PDF render error:', err);
      }
    });
    
    return () => {
      // Cancel the render task if the component unmounts
      if (renderTask) {
        renderTask.cancel();
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

export default function PDFViewer({ url, previewLimit = null, onUpgrade }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);

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
        
        let pagesToRender = loadedPdf.numPages;
        if (previewLimit !== null && previewLimit > 0) {
          pagesToRender = Math.min(loadedPdf.numPages, previewLimit);
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
  }, [url, previewLimit]);

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

  const isLocked = previewLimit !== null && numPages > previewLimit;

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] relative font-sans">
      <div className="absolute top-0 left-0 right-0 h-14 bg-white flex items-center justify-between px-6 border-b border-slate-200 z-10 shadow-sm">
        <span className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
          <FileText size={18} className="text-blue-600" /> MS Academy Document Viewer {isLocked && <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-[900]">Preview</span>}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={zoomOut} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><ZoomOut size={18} /></button>
          <span className="text-sm font-[900] text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
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
        
        {!loading && !error && pages.map((page, index) => (
          <PdfPage key={index} page={page} scale={scale} />
        ))}

        {!loading && isLocked && (
          <div className="w-full max-w-3xl shrink-0 bg-white border-2 border-amber-100 rounded-[32px] p-12 text-center shadow-2xl my-8 relative overflow-hidden flex flex-col items-center">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            
            <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-500 rounded-full flex items-center justify-center mb-8 shadow-inner border border-amber-200 z-10 relative group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping opacity-50"></div>
              <Lock size={40} className="drop-shadow-sm" />
            </div>
            
            <h3 className="text-3xl font-[900] text-slate-900 mb-4 tracking-tight z-10 relative">Unlock the Full Material</h3>
            
            <p className="text-slate-500 text-[17px] mb-10 max-w-xl font-medium leading-relaxed z-10 relative">
              You've reached the end of the free preview. There are <strong className="text-slate-800 bg-amber-100 px-2 py-0.5 rounded-md font-bold">{numPages - previewLimit} more pages</strong> waiting for you! 
              Purchase the course bundle to instantly unlock the entire high-quality document.
            </p>
            
            <button onClick={onUpgrade} className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-[900] text-lg shadow-xl shadow-amber-500/25 transition-all hover:-translate-y-1 inline-flex items-center gap-3 z-10 relative group border border-amber-400/50">
              <Lock size={20} className="group-hover:scale-110 transition-transform" /> Upgrade to Pro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
