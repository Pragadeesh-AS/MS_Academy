import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, Trash2, Highlighter } from 'lucide-react';

export default function Whiteboard({ onStreamReady, isOverlay = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Tools: 'pen', 'highlighter', 'eraser'
  const [activeTool, setActiveTool] = useState('pen');
  // Colors
  const colors = [
    { name: 'Black', value: '#1E293B' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Green', value: '#22C55E' }
  ];
  const [activeColor, setActiveColor] = useState(colors[0].value);
  
  // Initialize canvas and stream
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set internal resolution based on CSS size for crisp drawing
    const resizeCanvas = () => {
      const parent = containerRef.current;
      if (parent) {
        const { width, height } = parent.getBoundingClientRect();
        canvas.width = width || 1280;
        canvas.height = height || 720;
        
        // Fill white background initially
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    
    resizeCanvas();
    
    // Delay captureStream slightly to ensure the canvas has been painted
    const timeout = setTimeout(() => {
      try {
        const stream = canvas.captureStream(30); // 30 FPS
        
        // Force a frame update every second to keep the WebRTC stream alive if static
        const keepAliveInterval = setInterval(() => {
          const ctx = canvas.getContext('2d');
          // Draw a completely invisible dot in the corner
          ctx.fillStyle = 'rgba(255,255,255,0.01)';
          ctx.fillRect(0, 0, 1, 1);
        }, 1000);
        
        if (onStreamReady) onStreamReady(stream);
        
        // Cleanup interval on unmount
        canvas.keepAlive = keepAliveInterval;
      } catch (e) {
        console.error("Canvas captureStream not supported", e);
      }
    }, 500);
    
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timeout);
      if (canvas.keepAlive) clearInterval(canvas.keepAlive);
    };
  }, [onStreamReady]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    
    draw(e);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (activeTool === 'eraser') {
      // Instead of destination-out (which makes pixels transparent and thus black in video),
      // we draw with a solid white color to "erase".
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 40;
      ctx.strokeStyle = '#FFFFFF';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 30;
      const hex = activeColor.replace('#', '');
      const r = parseInt(hex.substring(0,2), 16);
      const g = parseInt(hex.substring(2,4), 16);
      const b = parseInt(hex.substring(4,6), 16);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.05)`; // Lighter for overlay effect
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 4;
      ctx.strokeStyle = activeColor;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden ${isOverlay ? 'bg-transparent' : 'bg-slate-900'}`} ref={containerRef}>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair bg-white touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      {/* Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-2 flex flex-col items-center gap-4 border border-slate-200 z-50">
        
        {/* Tools */}
        <div className="flex flex-col items-center gap-1 bg-slate-50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTool('pen')}
            className={`p-2.5 rounded-lg transition-colors ${activeTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
            title="Pen"
          >
            <PenTool size={20} />
          </button>
          <button 
            onClick={() => setActiveTool('highlighter')}
            className={`p-2.5 rounded-lg transition-colors ${activeTool === 'highlighter' ? 'bg-amber-100 text-amber-600' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
            title="Highlighter"
          >
            <Highlighter size={20} />
          </button>
          <button 
            onClick={() => setActiveTool('eraser')}
            className={`p-2.5 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
        </div>
        
        <div className="w-8 h-px bg-slate-200"></div>
        
        {/* Colors */}
        <div className="flex flex-col items-center gap-2">
          {colors.map(color => (
            <button
              key={color.name}
              onClick={() => { setActiveColor(color.value); if (activeTool === 'eraser') setActiveTool('pen'); }}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${activeColor === color.value && activeTool !== 'eraser' ? 'scale-110 border-slate-400' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
        
        <div className="w-8 h-px bg-slate-200"></div>
        
        {/* Actions */}
        <button 
          onClick={clearBoard}
          className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex items-center justify-center"
          title="Clear Board"
        >
          <Trash2 size={20} />
        </button>
        
      </div>
      
    </div>
  );
}
