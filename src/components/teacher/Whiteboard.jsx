import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, Trash2, Highlighter, Plus, MousePointer2, Palette, X, Shapes, Square, Circle, Triangle, Minus, ArrowRight, Hexagon, Diamond, Pentagon, Octagon, Star } from 'lucide-react';

export default function Whiteboard({ onStreamReady, isOverlay = false, canvasId = 'whiteboard-canvas' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Tools: 'select', 'pen', 'highlighter', 'eraser'
  const [activeTool, setActiveTool] = useState('select');
  const [penSize, setPenSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(40);
  const [showToolOptions, setShowToolOptions] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBoardColors, setShowBoardColors] = useState(false);
  
  const [activeShape, setActiveShape] = useState('rectangle');
  const [showShapeOptions, setShowShapeOptions] = useState(false);
  const snapshotRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  
  const boardBgColors = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Dark Slate', value: '#0f172a' },
    { name: 'Chalkboard', value: '#064e3b' }
  ];
  const [boardColor, setBoardColor] = useState('#FFFFFF');

  // Drag state for the menu
  const [menuOffset, setMenuOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMenu, setIsDraggingMenu] = useState(false);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Colors
  const staticColors = [
    { name: 'Black', value: '#1E293B' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#EAB308' }
  ];
  const [dynamicColors, setDynamicColors] = useState([
    { name: 'Green', value: '#22c55e' },
    { name: 'Light Blue', value: '#0ea5e9' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Lime', value: '#a3e635' },
    { name: 'Cyan', value: '#7dd3fc' },
    { name: 'Gray', value: '#94a3b8' },
    { name: 'Light Purple', value: '#c4b5fd' }
  ]);
  const [activeColor, setActiveColor] = useState(staticColors[0].value);

  const handleCustomColor = (colorValue) => {
    setActiveColor(colorValue);
    const allColors = [...staticColors, ...dynamicColors];
    const exists = allColors.some(c => c.value.toLowerCase() === colorValue.toLowerCase());
    
    if (!exists) {
      setDynamicColors(prev => {
        const newColors = [{ name: 'Custom', value: colorValue }, ...prev];
        return newColors.slice(0, 8); // Keep only 8 dynamic colors
      });
    }
  };
  
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
        
        // Fill white background initially if not overlay
        const ctx = canvas.getContext('2d');
        if (!isOverlay) {
          ctx.fillStyle = boardColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
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
  }, [onStreamReady, isOverlay, boardColor]);

  // Global drag handler for the menu
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragRef.current.isDragging) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setIsDraggingMenu(true);
      }
      
      if (isDraggingMenu || Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setMenuOffset({
          x: dragRef.current.initialX + dx,
          y: dragRef.current.initialY + dy
        });
      }
    };

    const handlePointerUp = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
        setTimeout(() => setIsDraggingMenu(false), 50);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingMenu]);

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
    setShowToolOptions(false);
    setShowBoardColors(false);
    setShowShapeOptions(false);
    
    if (activeTool === 'select' || isMenuOpen) return; // Disable drawing in select mode or when menu is open

    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    setIsDrawing(true);
    startPosRef.current = { x, y };
    
    if (activeTool === 'shapes') {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
      draw(e);
    }
  };

  const draw = (e) => {
    if (!isDrawing || activeTool === 'select') return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (activeTool === 'shapes') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = penSize;
      ctx.strokeStyle = activeColor;
      ctx.beginPath();
      
      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;
      
      if (activeShape === 'rectangle') {
        ctx.rect(startX, startY, x - startX, y - startY);
      } else if (activeShape === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      } else if (activeShape === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
      } else if (activeShape === 'triangle') {
        ctx.moveTo(startX + (x - startX) / 2, startY);
        ctx.lineTo(x, y);
        ctx.lineTo(startX, y);
        ctx.closePath();
      } else if (activeShape === 'arrow') {
        const headlen = 20; 
        const dx = x - startX;
        const dy = y - startY;
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
      } else if (activeShape === 'hexagon') {
        const w = x - startX;
        const h = y - startY;
        ctx.moveTo(startX + w * 0.25, startY);
        ctx.lineTo(startX + w * 0.75, startY);
        ctx.lineTo(startX + w, startY + h * 0.5);
        ctx.lineTo(startX + w * 0.75, startY + h);
        ctx.lineTo(startX + w * 0.25, startY + h);
        ctx.lineTo(startX, startY + h * 0.5);
        ctx.closePath();
      } else if (activeShape === 'pentagon') {
        const sides = 5;
        const cx = startX + (x - startX) / 2;
        const cy = startY + (y - startY) / 2;
        const radius = Math.min(Math.abs(x - startX), Math.abs(y - startY)) / 2;
        const angle = (Math.PI * 2) / sides;
        ctx.moveTo(cx, cy - radius);
        for (let i = 1; i <= sides; i++) {
          ctx.lineTo(cx + radius * Math.sin(i * angle), cy - radius * Math.cos(i * angle));
        }
        ctx.closePath();
      } else if (activeShape === 'octagon') {
        const sides = 8;
        const cx = startX + (x - startX) / 2;
        const cy = startY + (y - startY) / 2;
        const radius = Math.min(Math.abs(x - startX), Math.abs(y - startY)) / 2;
        const angle = (Math.PI * 2) / sides;
        ctx.moveTo(cx + radius * Math.sin(angle/2), cy - radius * Math.cos(angle/2));
        for (let i = 1; i <= sides; i++) {
          ctx.lineTo(cx + radius * Math.sin(i * angle + angle/2), cy - radius * Math.cos(i * angle + angle/2));
        }
        ctx.closePath();
      } else if (activeShape === 'star') {
        const cx = startX + (x - startX) / 2;
        const cy = startY + (y - startY) / 2;
        const outerRadius = Math.min(Math.abs(x - startX), Math.abs(y - startY)) / 2;
        const innerRadius = outerRadius / 2;
        const spikes = 5;
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
          rot += step;
          ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
      }
      ctx.stroke();
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = eraserSize;
      ctx.strokeStyle = isOverlay ? '#FFFFFF' : boardColor;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 30;
      let r = 0, g = 0, b = 0;
      if (activeColor.startsWith('#')) {
        const hex = activeColor.replace('#', '');
        if (hex.length === 6) {
          r = parseInt(hex.substring(0,2), 16);
          g = parseInt(hex.substring(2,4), 16);
          b = parseInt(hex.substring(4,6), 16);
        }
      }
      ctx.strokeStyle = `rgba(${r},${g},${b},0.05)`; // Lighter for overlay effect
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = penSize;
      ctx.strokeStyle = activeColor;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (activeTool !== 'shapes') {
        ctx.closePath();
      }
      setIsDrawing(false);
      snapshotRef.current = null;
    }
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.globalCompositeOperation = 'source-over';
    if (!isOverlay) {
      ctx.fillStyle = boardColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden ${isOverlay ? 'bg-transparent' : 'bg-slate-900'}`} ref={containerRef}>
      
      {/* Canvas */}
      <canvas
        id={canvasId}
        ref={canvasRef}
        className={`w-full h-full ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'} bg-white touch-none`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      {/* Radial Menu Container */}
      <div 
        className="absolute right-12 bottom-12 z-50 flex items-center justify-center pointer-events-none"
        style={{ transform: `translate(${menuOffset.x}px, ${menuOffset.y}px)` }}
      >
        
        {/* Board Color Popout */}
        <div className={`absolute bottom-full mb-8 transition-all duration-300 pointer-events-auto flex gap-3 p-3 bg-white rounded-full shadow-2xl border border-slate-200 ${showBoardColors && !isMenuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'}`}>
          {boardBgColors.map(color => (
            <button
              key={color.name}
              onClick={() => { setBoardColor(color.value); setShowBoardColors(false); }}
              className={`w-10 h-10 rounded-full border-2 transition-transform ${boardColor === color.value ? 'scale-110 border-slate-900' : 'border-slate-200 hover:scale-105 shadow-sm'}`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        {/* Shape Options Popout */}
        <div className={`absolute right-full mr-8 transition-all duration-300 pointer-events-auto flex flex-col gap-4 p-5 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-auto ${showShapeOptions && !isMenuOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-50 pointer-events-none'}`}>
          <div className="flex items-center gap-3 max-w-[196px] overflow-x-auto pb-2 custom-scrollbar">
            {[
              { id: 'line', icon: <Minus size={20} />, label: 'Line' },
              { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle' },
              { id: 'circle', icon: <Circle size={20} />, label: 'Circle' },
              { id: 'triangle', icon: <Triangle size={20} />, label: 'Triangle' },
              { id: 'diamond', icon: <Diamond size={20} />, label: 'Diamond' },
              { id: 'pentagon', icon: <Pentagon size={20} />, label: 'Pentagon' },
              { id: 'hexagon', icon: <Hexagon size={20} />, label: 'Hexagon' },
              { id: 'octagon', icon: <Octagon size={20} />, label: 'Octagon' },
              { id: 'star', icon: <Star size={20} />, label: 'Star' },
            ].map(shape => (
              <button
                key={shape.id}
                onClick={() => setActiveShape(shape.id)}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-2 ${activeShape === shape.id ? 'border-slate-300 bg-slate-700 text-white shadow-md' : 'border-transparent text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                title={shape.label}
              >
                {shape.icon}
              </button>
            ))}
          </div>
          
          <div className="w-full h-px bg-slate-700" />
          
          {/* Include Size Slider */}
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 bg-white rounded-full shrink-0" style={{ transform: `scale(${Math.max(0.3, penSize / 12)})` }} />
            <input 
              type="range" 
              min="1" 
              max="24" 
              value={penSize} 
              onChange={(e) => setPenSize(Number(e.target.value))} 
              className="flex-1 accent-white w-40 cursor-pointer" 
            />
          </div>

          <div className="w-full h-px bg-slate-700" />

          {/* Include Color Picker inside Shapes */}
          <div className="flex items-center gap-5">
            <div className="grid grid-cols-4 gap-2.5">
              {[...staticColors, ...dynamicColors].map((color, idx) => (
                <button
                  key={`shape-color-${color.name}-${idx}`}
                  onClick={() => setActiveColor(color.value)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === color.value ? 'scale-125 border-slate-300 shadow-md z-10' : 'border-slate-600 hover:scale-110'}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-lg" title="Custom Color" style={{ background: 'conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)' }}>
              <input 
                type="color" 
                value={![...staticColors, ...dynamicColors].some(c => c.value === activeColor) ? activeColor : '#000000'}
                onChange={(e) => handleCustomColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
              <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-slate-700 rounded-full p-0.5 border border-slate-500 shadow-sm pointer-events-none">
                <Plus size={10} className="text-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Tool Options Popout (Slider + Colors) */}
        <div className={`absolute right-full mr-8 transition-all duration-300 pointer-events-auto flex flex-col gap-4 p-5 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-auto ${showToolOptions && !isMenuOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-50 pointer-events-none'}`}>
          {/* Size Slider */}
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 bg-white rounded-full shrink-0" style={{ transform: `scale(${activeTool === 'eraser' ? Math.max(0.2, eraserSize / 40) : Math.max(0.3, penSize / 12)})` }} />
            <input 
              type="range" 
              min={activeTool === 'eraser' ? "10" : "1"} 
              max={activeTool === 'eraser' ? "100" : "24"} 
              value={activeTool === 'eraser' ? eraserSize : penSize} 
              onChange={(e) => activeTool === 'eraser' ? setEraserSize(Number(e.target.value)) : setPenSize(Number(e.target.value))} 
              className="flex-1 accent-white w-40 cursor-pointer" 
            />
          </div>

          {/* Color Picker Grid (Hidden for Eraser) */}
          {activeTool !== 'eraser' && (
            <>
              <div className="w-full h-px bg-slate-700" />
              <div className="flex items-center gap-5">
                
                {/* 4x3 Grid */}
                <div className="grid grid-cols-4 gap-2.5">
                  {/* Preset Colors */}
                  {[...staticColors, ...dynamicColors].map((color, idx) => (
                    <button
                      key={`${color.name}-${idx}`}
                      onClick={() => setActiveColor(color.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === color.value ? 'scale-125 border-slate-300 shadow-md z-10' : 'border-slate-600 hover:scale-110'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>

                {/* Custom Color Wheel */}
                <div className="relative flex items-center justify-center w-12 h-12 rounded-full cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-lg" title="Custom Color" style={{ background: 'conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)' }}>
                  <input 
                    type="color" 
                    value={![...staticColors, ...dynamicColors].some(c => c.value === activeColor) ? activeColor : '#000000'}
                    onChange={(e) => handleCustomColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-slate-700 rounded-full p-0.5 border border-slate-500 shadow-sm pointer-events-none">
                    <Plus size={10} className="text-slate-300" />
                  </div>
                </div>

              </div>
            </>
          )}
        </div>

        {/* Radial Buttons */}
        <div className="relative flex items-center justify-center w-12 h-12 pointer-events-auto">
          {(() => {
            const menuItems = [
              { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
              { id: 'shapes', icon: <Shapes size={18} />, label: 'Shapes' },
              { id: 'pen', icon: <PenTool size={18} />, label: 'Pen' },
              { id: 'highlighter', icon: <Highlighter size={18} />, label: 'Highlight' },
              { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
              { id: 'colors', icon: <Palette size={18} />, label: 'Colors' },
              { id: 'clear', icon: <Trash2 size={18} />, label: 'Clear' },
            ];
            
            const radius = 65; // distance from center
            return menuItems.map((item, index) => {
              const angle = (index * (360 / menuItems.length)) - 90; // Start at top
              const radians = (angle * Math.PI) / 180;
              const x = Math.cos(radians) * radius;
              const y = Math.sin(radians) * radius;
              const isActive = activeTool === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'clear') {
                      clearBoard();
                      setIsMenuOpen(false);
                    } else if (item.id === 'colors') {
                      setIsMenuOpen(false);
                      setShowBoardColors(true);
                      setShowToolOptions(false);
                      setShowShapeOptions(false);
                    } else {
                      setActiveTool(item.id);
                      setIsMenuOpen(false);
                      setShowBoardColors(false);
                      if (['pen', 'highlighter', 'eraser'].includes(item.id)) {
                        setShowToolOptions(true);
                        setShowShapeOptions(false);
                      } else if (item.id === 'shapes') {
                        setShowShapeOptions(true);
                        setShowToolOptions(false);
                      } else {
                        setShowToolOptions(false);
                        setShowShapeOptions(false);
                      }
                    }
                  }}
                  className={`absolute flex flex-col items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-300 border border-slate-200/50 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-800 text-white hover:bg-slate-700'} ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
                  style={{ 
                    transform: isMenuOpen ? `translate(${x}px, ${y}px) scale(1)` : `translate(0px, 0px) scale(0)`,
                    transitionDelay: isMenuOpen ? `${index * 30}ms` : '0ms'
                  }}
                  title={item.label}
                >
                  {item.icon}
                </button>
              );
            });
          })()}
          
          {/* Center Toggle Button */}
          <button
            onPointerDown={(e) => {
              if (e.button !== 0 && e.type !== 'touchstart') return;
              dragRef.current = {
                isDragging: true,
                startX: e.type === 'touchstart' ? e.touches[0].clientX : e.clientX,
                startY: e.type === 'touchstart' ? e.touches[0].clientY : e.clientY,
                initialX: menuOffset.x,
                initialY: menuOffset.y
              };
            }}
            onClick={(e) => {
              if (isDraggingMenu) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              setIsMenuOpen(!isMenuOpen);
              setShowToolOptions(false);
              setShowBoardColors(false);
              setShowShapeOptions(false);
            }}
            className="absolute z-10 flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white shadow-xl hover:scale-105 transition-transform border-2 border-white/20 touch-none cursor-grab active:cursor-grabbing"
          >
            {isMenuOpen ? (
              <X size={20} />
            ) : (
              // Show active tool icon when collapsed
              activeTool === 'select' ? <MousePointer2 size={20} /> :
              activeTool === 'shapes' ? <Shapes size={20} /> :
              activeTool === 'pen' ? <PenTool size={20} /> :
              activeTool === 'highlighter' ? <Highlighter size={20} /> :
              activeTool === 'eraser' ? <Eraser size={20} /> :
              <MousePointer2 size={20} />
            )}
          </button>
        </div>
      </div>
      
    </div>
  );
}
