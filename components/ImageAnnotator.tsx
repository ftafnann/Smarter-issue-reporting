import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PencilIcon, TypeIcon, UndoIcon, TrashIcon, RectangleIcon, CircleIcon, EraserIcon } from './icons';

interface ImageAnnotatorProps {
  src: string;
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
}

type Annotation = 
  | { type: 'path'; points: { x: number; y: number }[]; color: string; lineWidth: number; mode: 'source-over' | 'destination-out'; }
  | { type: 'text'; text: string; x: number; y: number; color: string; font: string; }
  | { type: 'rectangle'; x: number; y: number; width: number; height: number; color: string; lineWidth: number; }
  | { type: 'circle'; cx: number; cy: number; radius: number; color: string; lineWidth: number; };

type Tool = 'draw' | 'text' | 'rectangle' | 'circle' | 'eraser';

const COLORS = ['#DC2626', '#EA580C', '#16A34A', '#2563EB', '#7C3AED', '#171717'];

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ src, onComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  
  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<Annotation[]>([]);
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [currentText, setCurrentText] = useState('');

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    history.forEach(item => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.type === 'path') {
        ctx.globalCompositeOperation = item.mode;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.lineWidth;
        ctx.beginPath();
        item.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (item.type === 'text') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = item.color;
        ctx.font = item.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(item.text, item.x, item.y);
      } else if (item.type === 'rectangle') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.lineWidth;
        ctx.strokeRect(item.x, item.y, item.width, item.height);
      } else if (item.type === 'circle') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.lineWidth;
        ctx.beginPath();
        ctx.arc(item.cx, item.cy, Math.abs(item.radius), 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }, [history]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 600;
      let { width, height } = img;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      imageRef.current = img;
      redrawCanvas();
    };
  }, [src, redrawCanvas]);

  const getCanvasCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    return {
      x: canvasX * scaleX,
      y: canvasY * scaleY,
    };
  };

  const startInteraction = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    if (tool === 'text') return;
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(event);
    startPointRef.current = { x, y };

    let newAnnotation: Annotation | null = null;
    switch (tool) {
      case 'draw':
      case 'eraser':
        newAnnotation = { type: 'path', points: [{ x, y }], color, lineWidth: brushSize, mode: tool === 'draw' ? 'source-over' : 'destination-out' };
        break;
      case 'rectangle':
        newAnnotation = { type: 'rectangle', x, y, width: 0, height: 0, color, lineWidth: brushSize };
        break;
      case 'circle':
        newAnnotation = { type: 'circle', cx: x, cy: y, radius: 0, color, lineWidth: brushSize };
        break;
    }
    if (newAnnotation) {
      setHistory(prev => [...prev, newAnnotation!]);
    }
  };

  const moveInteraction = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);
    
    setHistory(prev => {
      const currentHistory = [...prev];
      const lastItem = currentHistory[currentHistory.length - 1];
      if (!lastItem) return currentHistory;

      switch (lastItem.type) {
        case 'path':
          lastItem.points.push({ x, y });
          break;
        case 'rectangle':
          if (startPointRef.current) {
            lastItem.x = Math.min(x, startPointRef.current.x);
            lastItem.y = Math.min(y, startPointRef.current.y);
            lastItem.width = Math.abs(x - startPointRef.current.x);
            lastItem.height = Math.abs(y - startPointRef.current.y);
          }
          break;
        case 'circle':
          if (startPointRef.current) {
            const dx = x - startPointRef.current.x;
            const dy = y - startPointRef.current.y;
            lastItem.radius = Math.sqrt(dx * dx + dy * dy);
          }
          break;
      }
      return currentHistory;
    });
    redrawCanvas();
  };

  const stopInteraction = () => {
    setIsDrawing(false);
    startPointRef.current = null;
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (tool !== 'text') return;
    const { x, y } = getCanvasCoordinates(event);
    setTextInputPosition({ x, y });
    setIsTextInputVisible(true);
  };
  
  const handleTextSubmit = () => {
    if (currentText.trim() === '') {
      setIsTextInputVisible(false);
      setCurrentText('');
      return;
    }
    const newText: Annotation = {
      type: 'text',
      text: currentText,
      x: textInputPosition.x,
      y: textInputPosition.y,
      color,
      font: `bold ${brushSize * 5 + 10}px 'Plus Jakarta Sans', sans-serif`
    };
    setHistory(prev => [...prev, newText]);
    setIsTextInputVisible(false);
    setCurrentText('');
  };

  const handleUndo = () => {
    setHistory(prev => prev.slice(0, -1));
    redrawCanvas();
  };

  const handleClear = () => {
    setHistory([]);
    redrawCanvas();
  };
  
  const handleComplete = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onComplete(canvas.toDataURL('image/jpeg'));
    }
  };

  const ToolButton: React.FC<{ myTool: Tool, label: string, children: React.ReactNode }> = ({ myTool, label, children }) => (
    <button 
      type="button"
      onClick={() => setTool(myTool)} 
      className={`p-2 rounded-xl transition-all ${
        tool === myTool 
          ? 'bg-[#171717] text-white shadow-sm' 
          : 'text-[#737373] hover:text-[#171717] hover:bg-black/[0.04]'
      }`} 
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full space-y-4 p-4 bg-white/90 backdrop-blur-md border border-[#EAE7DF] rounded-3xl shadow-card">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
        <h4 className="text-sm font-semibold text-[#171717]">Incident Evidence Annotation</h4>
        <span className="text-xs text-[#858585]">Highlight key components or anomalies</span>
      </div>

      <div className="relative w-full flex justify-center items-center bg-[#F8F7F3] rounded-2xl p-2 border border-[#EAE7DF] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="rounded-xl max-w-full h-auto cursor-crosshair shadow-sm"
          onMouseDown={startInteraction}
          onMouseMove={moveInteraction}
          onMouseUp={stopInteraction}
          onMouseLeave={stopInteraction}
          onTouchStart={startInteraction}
          onTouchMove={moveInteraction}
          onTouchEnd={stopInteraction}
          onClick={handleCanvasClick}
        />
        {isTextInputVisible && (
          <div style={{ position: 'absolute', left: textInputPosition.x, top: textInputPosition.y, transform: 'translate(-2px, -2px)' }}>
            <input
              type="text"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              autoFocus
              className="bg-white/95 text-[#171717] px-2 py-1 border border-[#B7ACF5] rounded-md shadow-lg outline-none font-sans"
              style={{ fontSize: `${brushSize * 4 + 12}px`, fontWeight: '600', color }}
              placeholder="Type label..."
            />
          </div>
        )}
      </div>

      {/* Toolbar Controls */}
      <div className="p-3 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] flex flex-wrap justify-between items-center gap-3">
        {/* Tools */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#EAE7DF] shadow-sm">
          <ToolButton myTool="draw" label="Freehand Draw"><PencilIcon className="w-4 h-4" /></ToolButton>
          <ToolButton myTool="text" label="Add Text Note"><TypeIcon className="w-4 h-4" /></ToolButton>
          <ToolButton myTool="rectangle" label="Box Region"><RectangleIcon className="w-4 h-4" /></ToolButton>
          <ToolButton myTool="circle" label="Circle Anomaly"><CircleIcon className="w-4 h-4" /></ToolButton>
          <ToolButton myTool="eraser" label="Eraser"><EraserIcon className="w-4 h-4" /></ToolButton>
        </div>
        
        {/* Colors */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 px-3 rounded-2xl border border-[#EAE7DF] shadow-sm">
          {COLORS.map(c => (
            <button 
              key={c} 
              type="button"
              onClick={() => setColor(c)} 
              style={{ backgroundColor: c }} 
              className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                color === c ? 'ring-2 ring-offset-2 ring-[#B7ACF5] ring-offset-[#F8F7F3] scale-110' : ''
              }`} 
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#EAE7DF] shadow-sm">
          <label htmlFor="brushSize" className="text-xs font-semibold text-[#858585]">Size</label>
          <input 
            id="brushSize"
            type="range" 
            min="2" 
            max="18" 
            value={brushSize} 
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-[#171717] cursor-pointer"
          />
        </div>

        {/* Undo / Clear */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#EAE7DF] shadow-sm">
          <button 
            type="button"
            onClick={handleUndo} 
            disabled={history.length === 0} 
            className="p-2 rounded-xl text-[#737373] hover:text-[#171717] hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all" 
            title="Undo"
          >
            <UndoIcon className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={handleClear} 
            disabled={history.length === 0} 
            className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all" 
            title="Clear all"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button 
          type="button"
          onClick={onCancel} 
          className="px-5 py-2.5 rounded-2xl bg-white border border-[#EAE7DF] text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F8F7F3] transition-colors"
        >
          Cancel
        </button>
        <button 
          type="button"
          onClick={handleComplete} 
          className="px-6 py-2.5 rounded-2xl bg-[#171717] hover:bg-[#2e2e2e] text-white text-xs font-medium shadow-sm hover:shadow-card transition-all"
        >
          Confirm Annotations
        </button>
      </div>
    </div>
  );
};

export default ImageAnnotator;
