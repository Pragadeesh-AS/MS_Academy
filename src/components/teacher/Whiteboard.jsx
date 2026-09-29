import React, { useRef, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { PenTool, Eraser, Trash2, Highlighter, Plus, MousePointer2, Palette, X, Shapes, Square, Circle, Triangle, Minus, ArrowRight, Hexagon, Diamond, Pentagon, Octagon, Star, ChevronLeft, ChevronRight, Type, Hand, Undo, Redo } from 'lucide-react';
import logoImg from '../../assets/msgate_logo.png';

// Fix Fabric.js clipping bugs when panning the board
fabric.Object.prototype.skipOffscreen = false;

function PenIcon({ size = 24, ...props }) {
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...props}>
      <path fill="currentColor" d="m227.32 73.37l-44.69-44.68a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69l83.67-83.66l3.48 13.9l-36.8 36.79a8 8 0 0 0 11.31 11.32l40-40a8 8 0 0 0 2.11-7.6l-6.9-27.61L227.32 96a16 16 0 0 0 0-22.63M48 179.31L76.69 208H48Zm48 25.38L51.31 160L136 75.31L180.69 120Zm96-96L147.32 64l24-24L216 84.69Z"/>
    </svg>
  );
}

function HighlighterIcon({ size = 24, ...props }) {
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...props}>
      <path fill="currentColor" d="M253.66 106.34a8 8 0 0 0-11.32 0L192 156.69L107.31 72l50.35-50.34a8 8 0 1 0-11.32-11.32L96 60.69a16 16 0 0 0-2.82 18.81L72 100.69a16 16 0 0 0 0 22.62l4.69 4.69l-58.35 58.34a8 8 0 0 0 3.13 13.25l72 24A7.9 7.9 0 0 0 96 224a8 8 0 0 0 5.66-2.34L136 187.31l4.69 4.69a16 16 0 0 0 22.62 0l21.19-21.18a16 16 0 0 0 18.81-2.82l50.35-50.34a8 8 0 0 0 0-11.32M93.84 206.85l-55-18.35L88 139.31L124.69 176ZM152 180.69L83.31 112L104 91.31L172.69 160Z"/>
    </svg>
  );
}

export default function Whiteboard({ onStreamReady, isOverlay = false, canvasId = 'whiteboard-canvas' }) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const lastClickTimeRef = useRef({});
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Tools: 'select', 'pen', 'highlighter', 'eraser'
  const [activeTool, setActiveTool] = useState('select');
  const [penSize, setPenSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(40);
  const [showToolOptions, setShowToolOptions] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBoardColors, setShowBoardColors] = useState(false);
  const [showQuickColors, setShowQuickColors] = useState(false);
  
  const [activeShape, setActiveShape] = useState('rectangle');
  const [showShapeOptions, setShowShapeOptions] = useState(false);
  
  const [pagesData, setPagesData] = useState([{ id: Date.now(), data: null }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const saveCurrentPage = () => {
    if (fabricRef.current) {
      const data = fabricRef.current.toJSON();
      setPagesData(prev => {
        const newPages = [...prev];
        newPages[currentPageIndex].data = data;
        return newPages;
      });
    }
  };

  const loadPage = async (index, currentPages = pagesData) => {
    if (!fabricRef.current) return;
    isHistoryProcessingRef.current = true;
    const pageData = currentPages[index].data;
    if (pageData) {
      await fabricRef.current.loadFromJSON(pageData);
      fabricRef.current.renderAll();
    } else {
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = 'transparent';
      fabricRef.current.renderAll();
    }
    // Restore settings
    fabricRef.current.isDrawingMode = (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser');
    
    // Reset History for new page
    historyRef.current = [fabricRef.current.toJSON()];
    historyStepRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
    isHistoryProcessingRef.current = false;
  };

  const handleNextPage = async () => {
    saveCurrentPage();
    let newPages = [...pagesData];
    if (currentPageIndex === newPages.length - 1) {
      newPages.push({ id: Date.now(), data: null });
      setPagesData(newPages);
    }
    setCurrentPageIndex(prev => prev + 1);
    await loadPage(currentPageIndex + 1, newPages);
  };

  const handlePrevPage = async () => {
    if (currentPageIndex > 0) {
      saveCurrentPage();
      setCurrentPageIndex(prev => prev - 1);
      await loadPage(currentPageIndex - 1, pagesData);
    }
  };

  const snapshotRef = useRef(null);
  
  // History / Undo / Redo
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const isHistoryProcessingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyTimeoutRef = useRef(null);

  const saveHistory = () => {
    if (isHistoryProcessingRef.current) return;
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      if (!fabricRef.current || isHistoryProcessingRef.current) return;
      const json = fabricRef.current.toJSON();
      
      const currentHistory = historyRef.current;
      const currentStep = historyStepRef.current;
      
      const newHistory = currentHistory.slice(0, currentStep + 1);
      newHistory.push(json);
      
      // Keep last 50 steps
      if (newHistory.length > 50) newHistory.shift();
      
      historyRef.current = newHistory;
      historyStepRef.current = newHistory.length - 1;
      
      setCanUndo(historyStepRef.current > 0);
      setCanRedo(false);
    }, 150);
  };

  const handleUndo = async () => {
    if (historyStepRef.current > 0) {
      isHistoryProcessingRef.current = true;
      historyStepRef.current -= 1;
      await fabricRef.current.loadFromJSON(historyRef.current[historyStepRef.current]);
      fabricRef.current.renderAll();
      setCanUndo(historyStepRef.current > 0);
      setCanRedo(true);
      isHistoryProcessingRef.current = false;
    }
  };

  const handleRedo = async () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      isHistoryProcessingRef.current = true;
      historyStepRef.current += 1;
      await fabricRef.current.loadFromJSON(historyRef.current[historyStepRef.current]);
      fabricRef.current.renderAll();
      setCanUndo(true);
      setCanRedo(historyStepRef.current < historyRef.current.length - 1);
      isHistoryProcessingRef.current = false;
    }
  };


  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });
  
  const boardBgColors = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Dark Slate', value: '#0f172a' },
    { name: 'Chalkboard', value: '#064e3b' }
  ];
  const [boardColor, setBoardColor] = useState('#FFFFFF');
  const boardColorRef = useRef(boardColor);
  useEffect(() => {
    boardColorRef.current = boardColor;
  }, [boardColor]);

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
  const [recentColors, setRecentColors] = useState(['#1E293B', '#EF4444', '#3b82f6']);

  const handleColorSelect = (colorValue) => {
    setActiveColor(colorValue);
    setRecentColors(prev => {
      const newRecent = [colorValue, ...prev.filter(c => c !== colorValue)];
      return newRecent.slice(0, 3);
    });
  };

  const handleCustomColor = (colorValue) => {
    handleColorSelect(colorValue);
    const allColors = [...staticColors, ...dynamicColors];
    const exists = allColors.some(c => c.value.toLowerCase() === colorValue.toLowerCase());
    
    if (!exists) {
      setDynamicColors(prev => {
        const newColors = [{ name: 'Custom', value: colorValue }, ...prev];
        return newColors.slice(0, 8); // Keep only 8 dynamic colors
      });
    }
  };
  

  // Initialize Fabric Canvas
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    // Dynamically create the canvas to prevent React DOM mismatch when Fabric wraps it
    const canvasEl = document.createElement('canvas');
    canvasEl.id = canvasId;
    parent.appendChild(canvasEl);

    const { width, height } = parent.getBoundingClientRect();

    const fCanvas = new fabric.Canvas(canvasEl, {
      width: width || 1280,
      height: height || 720,
      isDrawingMode: false,
      backgroundColor: 'transparent',
      selection: true
    });
    
    fabricRef.current = fCanvas;
    fCanvas.renderAll();

    // Start capture stream for recording
    const timeout = setTimeout(() => {
      try {
        // ALWAYS use mixCanvas to inject watermark and background for the stream
        const activeCanvasEl = fCanvas.lowerCanvasEl || canvasEl;
        
        const mixCanvas = document.createElement('canvas');
        mixCanvas.width = activeCanvasEl.width;
        mixCanvas.height = activeCanvasEl.height;
        const mixCtx = mixCanvas.getContext('2d');
        
        const watermarkImg = new Image();
        watermarkImg.src = logoImg;

        const drawMixFrame = () => {
          if (mixCanvas.width !== activeCanvasEl.width || mixCanvas.height !== activeCanvasEl.height) {
            mixCanvas.width = activeCanvasEl.width;
            mixCanvas.height = activeCanvasEl.height;
          }
          
          if (!isOverlay) {
             mixCtx.fillStyle = boardColorRef.current || '#FFFFFF';
             mixCtx.fillRect(0, 0, mixCanvas.width, mixCanvas.height);
             
             if (watermarkImg.complete && watermarkImg.naturalWidth > 0) {
                 mixCtx.globalAlpha = 0.05; 
                 const w = 150;
                 const h = (150 / watermarkImg.naturalWidth) * watermarkImg.naturalHeight;
                 mixCtx.drawImage(watermarkImg, (mixCanvas.width - w) / 2, (mixCanvas.height - h) / 2, w, h);
                 mixCtx.globalAlpha = 1.0;
             }
          } else {
             mixCtx.fillStyle = '#ffffff';
             mixCtx.fillRect(0, 0, mixCanvas.width, mixCanvas.height);
          }

          mixCtx.drawImage(activeCanvasEl, 0, 0);

          // Small academy logo pinned to the top of every whiteboard page/stream
          if (watermarkImg.complete && watermarkImg.naturalWidth > 0) {
            const logoH = 36;
            const logoW = (logoH / watermarkImg.naturalHeight) * watermarkImg.naturalWidth;
            mixCtx.globalAlpha = 0.9;
            mixCtx.drawImage(watermarkImg, (mixCanvas.width - logoW) / 2, 10, logoW, logoH);
            mixCtx.globalAlpha = 1.0;
          }
        };
        
        drawMixFrame();
        const mixCanvasInterval = setInterval(drawMixFrame, 1000 / 30); // 30fps
        const streamTargetCanvas = mixCanvas;

        const stream = streamTargetCanvas.captureStream(30);
        
        const keepAliveInterval = setInterval(() => {
          if (!fabricRef.current) return;
          fabricRef.current.renderAll();
        }, 1000);
        
        if (onStreamReady) onStreamReady(stream);
        
        activeCanvasEl.keepAlive = keepAliveInterval;
        if (mixCanvasInterval) activeCanvasEl.mixCanvasInterval = mixCanvasInterval;
      } catch (e) {
        console.error('Canvas captureStream not supported', e);
      }
    }, 500);

    const resizeCanvas = () => {
      if (parent && fabricRef.current) {
        const rect = parent.getBoundingClientRect();
        // Prevent unnecessary rerenders if size hasn't actually changed
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.width !== fabricRef.current.width || rect.height !== fabricRef.current.height) {
          fabricRef.current.setWidth(rect.width);
          fabricRef.current.setHeight(rect.height);
          fabricRef.current.renderAll();
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    
    // Also use ResizeObserver for when layout changes without window resize (e.g., sidebar toggles, flexbox changes)
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(parent);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
      clearTimeout(timeout);
      
      const activeCanvasEl = fCanvas?.lowerCanvasEl || canvasEl;
      if (activeCanvasEl.keepAlive) clearInterval(activeCanvasEl.keepAlive);
      if (activeCanvasEl.mixCanvasInterval) clearInterval(activeCanvasEl.mixCanvasInterval);

      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
      
      // Remove the canvas element from DOM
      if (parent.contains(canvasEl)) {
        parent.removeChild(canvasEl);
      }
    };
  }, [onStreamReady, isOverlay, canvasId]);

  // Handle Board Color changes
  useEffect(() => {
    if (fabricRef.current && !isOverlay) {
      fabricRef.current.backgroundColor = 'transparent';
      fabricRef.current.renderAll();
    }
  }, [boardColor, isOverlay]);

  // Handle Tool Changes
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;

    // Reset interactions
    fCanvas.isDrawingMode = false;
    fCanvas.selection = false;
    fCanvas.forEachObject(obj => {
      obj.selectable = false;
      obj.evented = false;
    });

    if (activeTool === 'select') {
      fCanvas.selection = true;
      fCanvas.defaultCursor = 'default';
      fCanvas.forEachObject(obj => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else if (activeTool === 'pan') {
      fCanvas.selection = false;
      fCanvas.defaultCursor = 'grab';
      fCanvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === 'text') {
      fCanvas.selection = false;
      fCanvas.forEachObject(obj => {
        if (obj.type === 'i-text') {
          obj.selectable = true;
          obj.evented = true;
        }
      });
      fCanvas.defaultCursor = 'text';
    } else if (activeTool === 'pen' || activeTool === 'highlighter') {
      fCanvas.isDrawingMode = true;
      let brush = new fabric.PencilBrush(fCanvas);
      
      if (activeTool === 'highlighter') {
         let r = 0, g = 0, b = 0;
         if (activeColor.startsWith('#')) {
            const hex = activeColor.replace('#', '');
            if (hex.length === 6) {
              r = parseInt(hex.substring(0,2), 16);
              g = parseInt(hex.substring(2,4), 16);
              b = parseInt(hex.substring(4,6), 16);
            }
         }
         brush.color = `rgba(${r},${g},${b},0.3)`;
         brush.width = 30;
      } else {
         brush.color = activeColor;
         brush.width = penSize;
      }
      fCanvas.freeDrawingBrush = brush;
      fCanvas.defaultCursor = 'crosshair';
    } else if (activeTool === 'eraser') {
      fCanvas.isDrawingMode = true;
      let brush = new fabric.PencilBrush(fCanvas);
      // Visually acts as eraser while drawing. Will be converted to destination-out mask in path:created
      brush.color = isOverlay ? '#ffffff' : boardColor; 
      brush.width = eraserSize;
      fCanvas.freeDrawingBrush = brush;
      fCanvas.defaultCursor = 'cell';
    } else {
      fCanvas.defaultCursor = 'default';
    }
  }, [activeTool, activeColor, penSize, eraserSize, isOverlay, boardColor]);

  // Handle dynamically drawn paths to ensure they are selectable ONLY in select mode
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;
    
    const onPathCreated = (e) => {
      const path = e.path || e.object;
      if (path) {
        if (activeTool === 'eraser') {
          path.globalCompositeOperation = 'destination-out';
          // Force it to not be selectable
          path.selectable = false;
          path.evented = false;
          fCanvas.renderAll();
        } else {
          path.selectable = (activeTool === 'select');
          path.evented = (activeTool === 'select');
        }
      }
    };
    
    const onMouseDown = () => {
      // Hide all popouts when drawing starts
      setShowToolOptions(false);
      setShowShapeOptions(false);
      setShowBoardColors(false);
      setShowQuickColors(false);
    };
    
    fCanvas.on('path:created', onPathCreated);
    fCanvas.on('mouse:down', onMouseDown);
    
    return () => {
      fCanvas.off('path:created', onPathCreated);
      fCanvas.off('mouse:down', onMouseDown);
    };
  }, [activeTool]);

  // Handle History Tracking
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;
    
    if (historyRef.current.length === 0) {
      historyRef.current = [fCanvas.toJSON()];
      historyStepRef.current = 0;
    }
    
    const onHistoryEvent = () => {
      saveHistory();
    };

    fCanvas.on('path:created', onHistoryEvent);
    fCanvas.on('object:modified', onHistoryEvent);
    fCanvas.on('object:removed', onHistoryEvent);
    fCanvas.on('text:changed', onHistoryEvent);
    
    return () => {
      fCanvas.off('path:created', onHistoryEvent);
      fCanvas.off('object:modified', onHistoryEvent);
      fCanvas.off('object:removed', onHistoryEvent);
      fCanvas.off('text:changed', onHistoryEvent);
    };
  }, []);

  // Handle Shapes Drawing Logic
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;

    let isDrawingShape = false;
    let shape = null;
    let startX = 0;
    let startY = 0;

    const onMouseDown = (o) => {
      if (activeTool !== 'shapes') return;
      isDrawingShape = true;
      const pointer = o.scenePoint || o.pointer || { x: o.e.clientX, y: o.e.clientY };
      startX = pointer.x;
      startY = pointer.y;

      const shapeProps = {
        left: startX,
        top: startY,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: penSize,
        selectable: false, // only selectable when tool switches to select
        evented: false,
      };

      if (activeShape === 'rectangle') {
        shape = new fabric.Rect({ ...shapeProps, width: 0, height: 0 });
      } else if (activeShape === 'circle') {
        shape = new fabric.Circle({ ...shapeProps, radius: 0, originX: 'center', originY: 'center' });
      } else if (activeShape === 'triangle') {
        shape = new fabric.Triangle({ ...shapeProps, width: 0, height: 0 });
      } else if (activeShape === 'line') {
        shape = new fabric.Line([startX, startY, startX, startY], shapeProps);
      }
      
      if (shape) {
        fCanvas.add(shape);
      }
    };

    const onMouseMove = (o) => {
      if (!isDrawingShape || !shape || activeTool !== 'shapes') return;
      const pointer = o.scenePoint || o.pointer || { x: o.e.clientX, y: o.e.clientY };
      
      if (activeShape === 'rectangle') {
        shape.set({ width: Math.abs(startX - pointer.x), height: Math.abs(startY - pointer.y) });
        shape.set({ left: Math.min(startX, pointer.x), top: Math.min(startY, pointer.y) });
      } else if (activeShape === 'circle') {
        const radius = Math.sqrt(Math.pow(startX - pointer.x, 2) + Math.pow(startY - pointer.y, 2));
        shape.set({ radius: radius });
      } else if (activeShape === 'triangle') {
        shape.set({ width: Math.abs(startX - pointer.x), height: Math.abs(startY - pointer.y) });
        shape.set({ left: Math.min(startX, pointer.x), top: Math.min(startY, pointer.y) });
      } else if (activeShape === 'line') {
        shape.set({ x2: pointer.x, y2: pointer.y });
      }
      
      fCanvas.renderAll();
    };

    const onMouseUp = () => {
      if (activeTool !== 'shapes') return;
      isDrawingShape = false;
      if (shape) {
        shape.setCoords(); // Update hit boxes
        saveHistory();
      }
      shape = null;
    };

    fCanvas.on('mouse:down', onMouseDown);
    fCanvas.on('mouse:move', onMouseMove);
    fCanvas.on('mouse:up', onMouseUp);

    return () => {
      fCanvas.off('mouse:down', onMouseDown);
      fCanvas.off('mouse:move', onMouseMove);
      fCanvas.off('mouse:up', onMouseUp);
    };
  }, [activeTool, activeShape, activeColor, penSize]);

  // Handle Pan Logic
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    const onMouseDown = (opt) => {
      if (activeTool === 'pan' || (opt.e.altKey === true)) {
        isPanning = true;
        fCanvas.selection = false;
        fCanvas.defaultCursor = 'grabbing';
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
      }
    };

    const onMouseMove = (opt) => {
      if (isPanning) {
        const e = opt.e;
        const vpt = fCanvas.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        fCanvas.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    };

    const onMouseUp = () => {
      if (isPanning) {
        fCanvas.setViewportTransform(fCanvas.viewportTransform);
        isPanning = false;
        if (activeTool === 'pan') {
          fCanvas.defaultCursor = 'grab';
        } else {
          fCanvas.defaultCursor = 'default';
          fCanvas.selection = true;
        }
      }
    };
    
    const onWheel = (opt) => {
      const vpt = fCanvas.viewportTransform;
      vpt[4] -= opt.e.deltaX;
      vpt[5] -= opt.e.deltaY;
      fCanvas.requestRenderAll();
      opt.e.preventDefault();
      opt.e.stopPropagation();
    };

    fCanvas.on('mouse:down', onMouseDown);
    fCanvas.on('mouse:move', onMouseMove);
    fCanvas.on('mouse:up', onMouseUp);
    fCanvas.on('mouse:wheel', onWheel);

    return () => {
      fCanvas.off('mouse:down', onMouseDown);
      fCanvas.off('mouse:move', onMouseMove);
      fCanvas.off('mouse:up', onMouseUp);
      fCanvas.off('mouse:wheel', onWheel);
    };
  }, [activeTool]);

  // Handle Text Tool Logic
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;

    const onMouseDown = (o) => {
      if (activeTool !== 'text') return;
      
      // If clicked on an existing text object, allow editing it
      if (o.target && o.target.type === 'i-text') {
        return;
      }

      const pointer = o.scenePoint || o.pointer || { x: o.e.clientX, y: o.e.clientY };
      
      const text = new fabric.IText('', {
        left: pointer.x,
        top: pointer.y,
        fill: activeColor,
        fontSize: Math.max(24, penSize * 8),
        fontFamily: 'sans-serif',
        selectable: true,
        evented: true,
        editingBorderColor: '#3b82f6',
        padding: 5
      });

      fCanvas.add(text);
      fCanvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      fCanvas.renderAll();
    };

    fCanvas.on('mouse:down', onMouseDown);

    return () => {
      fCanvas.off('mouse:down', onMouseDown);
    };
  }, [activeTool, activeColor, penSize]);

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

  const clearBoard = () => {
    if (fabricRef.current) {
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = 'transparent';
      fabricRef.current.renderAll();
      saveHistory();
    }
  };


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
    
    if (activeTool === 'select' || activeTool === 'text' || activeTool === 'pan' || isMenuOpen) return; // Disable manual drawing in select/text/pan modes or when menu is open

    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    setIsDrawing(true);
    startPosRef.current = { x, y };
    lastPosRef.current = { x, y };
    
    if (activeTool === 'shapes') {
        snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      // Draw initial dot
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(x, y, (activeTool === 'eraser' ? eraserSize : activeTool === 'highlighter' ? 30 : penSize) / 2, 0, Math.PI * 2);
      
      if (activeTool === 'eraser') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke(); // Double stroke for visibility on dark/light backgrounds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // slight fill
        ctx.fill();
      } else {
        if (activeTool === 'highlighter') ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        else ctx.fillStyle = activeColor;
        ctx.fill();
      }
    }
  };

  const draw = (e) => {
    if (!isDrawing || activeTool === 'select' || activeTool === 'pan') return;
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
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
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
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = penSize;
      ctx.strokeStyle = activeColor;
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    lastPosRef.current = { x, y };
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

  // Handle Keyboard Delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't delete if user is typing in an input or textarea
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      
      const fCanvas = fabricRef.current;
      if (!fCanvas) return;

      // Don't delete if a Fabric IText is currently in editing mode
      const activeObject = fCanvas.getActiveObject();
      if (activeObject && activeObject.isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fCanvas.getActiveObjects();
        if (activeObjects && activeObjects.length > 0) {
          e.preventDefault();
          activeObjects.forEach(obj => {
            fCanvas.remove(obj);
          });
          fCanvas.discardActiveObject();
          fCanvas.renderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative w-full h-full flex flex-col whiteboard-container`} style={{ backgroundColor: isOverlay ? 'transparent' : boardColor }}>
      {/* Watermark for teacher view */}
      {!isOverlay && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
          <img src={logoImg} alt="Academy Logo" className="object-contain" style={{ width: '150px', height: 'auto', opacity: 0.1 }} />
        </div>
      )}

      {/* Small academy logo pinned to the top of every whiteboard page */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <img src={logoImg} alt="Academy Logo" className="opacity-90 drop-shadow object-contain" style={{ width: '120px', height: 'auto', maxHeight: '40px' }} />
      </div>

      {/* Dynamic Canvas Container */}
      <div className="w-full h-full touch-none pointer-events-auto z-10" ref={containerRef}></div>
      
      
      
      {/* Static Left Sidebar Menu */}
      <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 flex items-start gap-2 sm:gap-4 pointer-events-none max-h-[92vh]">

        {/* Main Toolbar */}
        <div className="bg-slate-800 rounded-2xl p-2 shadow-2xl border border-slate-700 flex flex-col items-center gap-2 pointer-events-auto max-h-[92vh] overflow-y-auto sm:overflow-visible">
          {[
            { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
            { id: 'pan', icon: <Hand size={18} />, label: 'Pan Board' },
            { id: 'text', icon: <Type size={18} />, label: 'Text' },
            { id: 'shapes', icon: <Shapes size={18} />, label: 'Shapes' },
            { id: 'pen', icon: <PenIcon size={18} />, label: 'Pen' },
            { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
            { id: 'highlighter', icon: <HighlighterIcon size={18} />, label: 'Highlight' },
            { id: 'colors', icon: <Palette size={18} />, label: 'Colors' },
            { id: 'undo', icon: <Undo size={18} />, label: 'Undo', disabled: !canUndo },
            { id: 'redo', icon: <Redo size={18} />, label: 'Redo', disabled: !canRedo },
            { id: 'clear', icon: <Trash2 size={18} />, label: 'Clear' },
          ].map((item) => {
            const isActive = activeTool === item.id || (item.id === 'colors' && showBoardColors);
            return (
              <div key={item.id} className="relative group">
                <button
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.id === 'undo') {
                      handleUndo();
                    } else if (item.id === 'redo') {
                      handleRedo();
                    } else if (item.id === 'clear') {
                      clearBoard();
                    } else if (item.id === 'colors') {
                      setShowBoardColors(!showBoardColors);
                      setShowToolOptions(false);
                      setShowShapeOptions(false);
                      setShowQuickColors(false);
                    } else {
                      if (activeTool === item.id) {
                        // Tool is already active, handle toggling options on click
                        if (item.id === 'pen') {
                          if (showQuickColors) {
                            // Quick colors are visible -> switch to full options (thickness + full palette)
                            setShowToolOptions(true);
                            setShowQuickColors(false);
                          } else if (showToolOptions) {
                            // Full options visible -> hide everything
                            setShowToolOptions(false);
                            setShowQuickColors(false);
                          } else {
                            // Both hidden (e.g. after drawing) -> show quick colors again
                            setShowQuickColors(true);
                          }
                        } else if (['highlighter', 'eraser'].includes(item.id)) {
                          setShowToolOptions(!showToolOptions);
                        } else if (item.id === 'shapes') {
                          setShowShapeOptions(!showShapeOptions);
                        }
                      } else {
                        // Switching to a new tool
                        setActiveTool(item.id);
                        setShowBoardColors(false);
                        setShowShapeOptions(false);

                        if (item.id === 'pen') {
                          // First click on the pen shows the 3 most recently used colors for quick
                          // reuse; click the pen again to open the full panel with the thickness slider.
                          setShowQuickColors(true);
                          setShowToolOptions(false);
                        } else {
                          setShowQuickColors(false);
                          setShowToolOptions(item.id === 'highlighter' || item.id === 'eraser');
                        }
                      }
                    }
                  }}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-100 text-indigo-600 shadow-md' : 'text-slate-300 hover:bg-slate-700 hover:text-white'} ${item.disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-300' : ''}`}
                  title={item.label}
                >
                  {item.icon}
                </button>
                
                {/* 3 Recently Used Colors explicitly when Pen is active (rendered inline for quick access) */}
                {item.id === 'pen' && activeTool === 'pen' && showQuickColors && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 sm:left-full sm:ml-3 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 sm:mt-0 flex items-center gap-1.5 p-1.5 bg-slate-800 rounded-full border border-slate-700 shadow-lg animate-in slide-in-from-left-2 fade-in z-20">
                    {recentColors.map((color, idx) => (
                      <button
                        key={`recent-${color}-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(color);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === color ? 'border-white scale-110 shadow-sm' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                        title={`Use Color ${color}`}
                      />
                    ))}
                    <div className="w-px h-5 bg-slate-600 mx-0.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuickColors(false);
                        setShowToolOptions(true);
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shrink-0"
                      title="More colors & pen thickness"
                    >
                      <div className="bg-white rounded-full shrink-0" style={{ width: Math.min(14, Math.max(4, penSize)), height: Math.min(14, Math.max(4, penSize)) }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Pagination Controls */}
          <div className="w-full h-px bg-slate-700 my-1" />
          <div className="flex flex-col items-center gap-2">
            <button onClick={handlePrevPage} disabled={currentPageIndex === 0} className="w-10 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:hover:text-slate-300 disabled:hover:bg-transparent transition-colors" title="Previous Page">
              <ChevronLeft size={18} />
            </button>
            <div className="text-slate-200 font-medium text-xs whitespace-nowrap text-center">
              {currentPageIndex + 1} / {pagesData.length}
            </div>
            <button onClick={handleNextPage} className="w-10 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title={currentPageIndex === pagesData.length - 1 ? "New Page" : "Next Page"}>
              {currentPageIndex === pagesData.length - 1 ? <Plus size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

        </div>

        {/* Popout Panels Container */}
        <div className="relative flex-col items-start pointer-events-auto h-full mt-2">
          
          {/* Board Color Popout */}
          {showBoardColors && (
            <div className="absolute left-0 top-0 flex items-center gap-3 p-3 bg-slate-800 rounded-full shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-left-2 z-10 w-max max-w-[92vw] flex-wrap">
              {boardBgColors.map(color => (
                <button
                  key={color.name}
                  onClick={() => { setBoardColor(color.value); setShowBoardColors(false); }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${boardColor === color.value ? 'scale-110 border-white shadow-md' : 'border-slate-500 hover:scale-105 shadow-sm'}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          )}

          {/* Shape Options Popout */}
          {showShapeOptions && (
            <div className="absolute left-0 top-0 flex flex-col gap-4 p-5 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-left-2 z-10 w-max max-w-[92vw] max-h-[85vh] overflow-y-auto">
              <div className="flex items-center gap-2 max-w-[200px] flex-wrap">
                {[
                  { id: 'line', icon: <Minus size={18} />, label: 'Line' },
                  { id: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
                  { id: 'circle', icon: <Circle size={18} />, label: 'Circle' },
                  { id: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
                  { id: 'diamond', icon: <Diamond size={18} />, label: 'Diamond' },
                  { id: 'pentagon', icon: <Pentagon size={18} />, label: 'Pentagon' },
                  { id: 'hexagon', icon: <Hexagon size={18} />, label: 'Hexagon' },
                  { id: 'octagon', icon: <Octagon size={18} />, label: 'Octagon' },
                  { id: 'star', icon: <Star size={18} />, label: 'Star' },
                ].map(shape => (
                  <button
                    key={shape.id}
                    onClick={() => setActiveShape(shape.id)}
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors border-2 ${activeShape === shape.id ? 'border-slate-300 bg-slate-700 text-white shadow-md' : 'border-transparent text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title={shape.label}
                  >
                    {shape.icon}
                  </button>
                ))}
              </div>
              
              <div className="w-full h-px bg-slate-700" />
              
              {/* Size Slider */}
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-white rounded-full shrink-0" style={{ transform: `scale(${Math.max(0.3, penSize / 12)})` }} />
                <input 
                  type="range" min="1" max="24" 
                  value={penSize} 
                  onChange={(e) => setPenSize(Number(e.target.value))} 
                  className="flex-1 accent-indigo-500 w-40 cursor-pointer" 
                />
              </div>

              <div className="w-full h-px bg-slate-700" />

              {/* Color Picker */}
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-4 gap-2">
                  {[...staticColors, ...dynamicColors].map((color, idx) => (
                    <button
                      key={`shape-color-${color.name}-${idx}`}
                      onClick={() => handleColorSelect(color.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === color.value ? 'scale-125 border-white shadow-md z-10' : 'border-slate-600 hover:scale-110'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-lg" title="Custom Color" style={{ background: 'conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)' }}>
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
          )}

          {/* Tool Options Popout */}
          {showToolOptions && (
            <div className="absolute left-0 top-0 flex flex-col gap-4 p-5 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-left-2 z-10 w-max max-w-[92vw] max-h-[85vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-white rounded-full shrink-0" style={{ transform: `scale(${activeTool === 'eraser' ? Math.max(0.2, eraserSize / 40) : Math.max(0.3, penSize / 12)})` }} />
                <input 
                  type="range" 
                  min={activeTool === 'eraser' ? "10" : "1"} 
                  max={activeTool === 'eraser' ? "100" : "24"} 
                  value={activeTool === 'eraser' ? eraserSize : penSize} 
                  onChange={(e) => activeTool === 'eraser' ? setEraserSize(Number(e.target.value)) : setPenSize(Number(e.target.value))} 
                  className="flex-1 accent-indigo-500 w-40 cursor-pointer" 
                />
              </div>

              {activeTool !== 'eraser' && (
                <>
                  <div className="w-full h-px bg-slate-700" />
                  <div className="flex items-center gap-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[...staticColors, ...dynamicColors].map((color, idx) => (
                        <button
                          key={`${color.name}-${idx}`}
                          onClick={() => handleColorSelect(color.value)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === color.value ? 'scale-125 border-white shadow-md z-10' : 'border-slate-600 hover:scale-110'}`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-lg" title="Custom Color" style={{ background: 'conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)' }}>
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
          )}
        </div>
      </div>
      
    </div>
  );
}
