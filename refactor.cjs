const fs = require('fs');
let code = fs.readFileSync('src/components/teacher/Whiteboard.jsx', 'utf8');

// Imports
code = code.replace(
  "import React, { useRef, useState, useEffect } from 'react';",
  "import React, { useRef, useState, useEffect } from 'react';\nimport * as fabric from 'fabric';"
);

// Add fabric canvas ref
code = code.replace(
  "const canvasRef = useRef(null);",
  "const canvasRef = useRef(null);\n  const fabricRef = useRef(null);"
);

// Add activeShapeRef
code = code.replace(
  "const activeShape = useRef('rectangle'); // Changed from state to ref if needed, wait, let's keep it as is",
  ""
);

// We'll replace the entire logic from 'useEffect(() => {' down to 'return ('
const startIdx = code.indexOf('  // Initialize canvas and stream');
const endIdx = code.indexOf('  return (');

const newLogic = `
  // Initialize Fabric Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const parent = containerRef.current;
    const { width, height } = parent ? parent.getBoundingClientRect() : { width: 1280, height: 720 };
    
    // Cleanup old fabric instance if it exists (Strict Mode support)
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const fCanvas = new fabric.Canvas(canvas, {
      width: width || 1280,
      height: height || 720,
      isDrawingMode: false,
      backgroundColor: isOverlay ? 'transparent' : boardColor,
      selection: true // allow multiple selection
    });
    
    fabricRef.current = fCanvas;

    // Fix for captureStream: force initial render
    fCanvas.renderAll();

    // Start capture stream for recording
    const timeout = setTimeout(() => {
      try {
        const stream = canvas.captureStream(30);
        
        const keepAliveInterval = setInterval(() => {
          if (!fabricRef.current) return;
          // Trigger minimal change to keep stream pushing frames if recording
          fabricRef.current.renderAll();
        }, 1000);
        
        if (onStreamReady) onStreamReady(stream);
        
        canvas.keepAlive = keepAliveInterval;
      } catch (e) {
        console.error('Canvas captureStream not supported', e);
      }
    }, 500);

    const resizeCanvas = () => {
      if (parent && fabricRef.current) {
        const rect = parent.getBoundingClientRect();
        fabricRef.current.setWidth(rect.width);
        fabricRef.current.setHeight(rect.height);
        fabricRef.current.renderAll();
      }
    };
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timeout);
      if (canvas.keepAlive) clearInterval(canvas.keepAlive);
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [onStreamReady, isOverlay]);

  // Handle Board Color changes
  useEffect(() => {
    if (fabricRef.current && !isOverlay) {
      fabricRef.current.backgroundColor = boardColor;
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
      fCanvas.forEachObject(obj => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      fCanvas.isDrawingMode = true;
      let brush = new fabric.PencilBrush(fCanvas);
      
      if (activeTool === 'eraser') {
         brush.color = isOverlay ? 'transparent' : boardColor;
         brush.width = eraserSize;
         // In a real app with transparent overlays, eraser is tricky. For solid backgrounds, matching bg color works perfectly.
      } else if (activeTool === 'highlighter') {
         // Create a translucent color
         let r = 0, g = 0, b = 0;
         if (activeColor.startsWith('#')) {
            const hex = activeColor.replace('#', '');
            if (hex.length === 6) {
              r = parseInt(hex.substring(0,2), 16);
              g = parseInt(hex.substring(2,4), 16);
              b = parseInt(hex.substring(4,6), 16);
            }
         }
         brush.color = \`rgba(\${r},\${g},\${b},0.3)\`;
         brush.width = 30;
      } else {
         brush.color = activeColor;
         brush.width = penSize;
      }
      
      fCanvas.freeDrawingBrush = brush;
    }
  }, [activeTool, activeColor, penSize, eraserSize, isOverlay, boardColor]);

  // Handle dynamically drawn paths to ensure they are selectable ONLY in select mode
  useEffect(() => {
    const fCanvas = fabricRef.current;
    if (!fCanvas) return;
    
    const onPathCreated = (e) => {
      const path = e.path;
      path.selectable = (activeTool === 'select');
      path.evented = (activeTool === 'select');
    };
    
    fCanvas.on('path:created', onPathCreated);
    return () => fCanvas.off('path:created', onPathCreated);
  }, [activeTool]);

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
      const pointer = fCanvas.getPointer(o.e);
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
      const pointer = fCanvas.getPointer(o.e);
      
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
      fabricRef.current.backgroundColor = isOverlay ? 'transparent' : boardColor;
      fabricRef.current.renderAll();
    }
  };

`;

code = code.substring(0, startIdx) + newLogic + code.substring(endIdx);

// Remove the old raw canvas event handlers from the return statement
code = code.replace(
  /onMouseDown=\{startDrawing\}[\s\S]*?onTouchEnd=\{stopDrawing\}/,
  ''
);

fs.writeFileSync('src/components/teacher/Whiteboard.jsx', code);
