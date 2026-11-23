import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon, CameraIcon, SparklesIcon } from './icons';

interface ImageUploaderProps {
  onImageSelect: (file: File, dataUrl: string) => void;
  imagePreviewUrl: string | null;
}

const colorStops = [
  { t: 0.00, r: 0,   g: 0,   b: 0 },
  { t: 0.15, r: 0,   g: 0,   b: 150 },
  { t: 0.30, r: 130, g: 0,   b: 150 }, // Purple
  { t: 0.50, r: 255, g: 0,   b: 0 },   // Red
  { t: 0.70, r: 255, g: 150, b: 0 },   // Orange
  { t: 0.85, r: 255, g: 255, b: 0 },   // Yellow
  { t: 1.00, r: 255, g: 255, b: 255 }  // White
];

const HEATMAP_COLORS = Array.from({ length: 256 }).map((_, i) => {
  const t = i / 255;
  let lower = colorStops[0];
  let upper = colorStops[colorStops.length - 1];
  for (let j = 0; j < colorStops.length - 1; j++) {
    if (t >= colorStops[j].t && t <= colorStops[j+1].t) {
      lower = colorStops[j];
      upper = colorStops[j+1];
      break;
    }
  }
  const range = upper.t - lower.t;
  if (range === 0) return [upper.r, upper.g, upper.b];
  const factor = (t - lower.t) / range;
  const r = Math.round(lower.r + factor * (upper.r - lower.r));
  const g = Math.round(lower.g + factor * (upper.g - lower.g));
  const b = Math.round(lower.b + factor * (upper.b - lower.b));
  return [r, g, b];
});

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, imagePreviewUrl }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isHeatMapEnabled, setIsHeatMapEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  }, []);

  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isHeatMapEnabled) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;

    const scale = 0.25;
    const lw = Math.floor(video.videoWidth * scale);
    const lh = Math.floor(video.videoHeight * scale);

    if (offCanvas.width !== lw) offCanvas.width = lw;
    if (offCanvas.height !== lh) offCanvas.height = lh;
    
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return;
    
    offCtx.drawImage(video, 0, 0, lw, lh);
    const imageData = offCtx.getImageData(0, 0, lw, lh);
    const data = imageData.data;
    
    // Pass 1: Extract Luminance
    const lumas = new Int32Array(lw * lh);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const i = (y * lw + x) * 4;
        lumas[y * lw + x] = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
      }
    }
    
    // Pass 2: Shape-from-shading thermal simulation
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const idx = y * lw + x;
        const luma = lumas[idx];
        let enhanced = luma;
        
        if (x > 0 && x < lw - 1 && y > 0 && y < lh - 1) {
          const tl = lumas[(y - 1) * lw + (x - 1)];
          const tc = lumas[(y - 1) * lw + x];
          const tr = lumas[(y - 1) * lw + (x + 1)];
          const ml = lumas[y * lw + (x - 1)];
          const mr = lumas[y * lw + (x + 1)];
          const bl = lumas[(y + 1) * lw + (x - 1)];
          const bc = lumas[(y + 1) * lw + x];
          const br = lumas[(y + 1) * lw + (x + 1)];
          
          const localAvg = (tl + tc + tr + ml + mr + bl + bc + br) / 8;
          const depthDiff = luma - localAvg;
          enhanced = luma + (depthDiff * 3.5); 
        }
        
        const finalLuma = Math.max(0, Math.min(255, Math.round(enhanced)));
        const color = HEATMAP_COLORS[finalLuma];
        
        const i = idx * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
      }
    }
    offCtx.putImageData(imageData, 0, 0);

    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.filter = 'blur(10px)';
      ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
    }
    requestRef.current = requestAnimationFrame(processFrame);
  }, [isHeatMapEnabled]);

  useEffect(() => {
    if (isHeatMapEnabled && isCameraOpen) {
      requestRef.current = requestAnimationFrame(processFrame);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isHeatMapEnabled, isCameraOpen, processFrame]);

  useEffect(() => {
    if (isCameraOpen) {
      setCameraError(null);
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          setCameraError("Could not access camera device. Please verify browser permissions.");
          setIsCameraOpen(false);
        });
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraOpen, stopCamera]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    if (isHeatMapEnabled && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      canvasRef.current.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'capture_thermal.jpg', { type: 'image/jpeg' });
          onImageSelect(file, dataUrl);
        }
      }, 'image/jpeg');
      setIsCameraOpen(false);
      return;
    }

    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'capture_evidence.jpg', { type: 'image/jpeg' });
            onImageSelect(file, dataUrl);
          }
        }, 'image/jpeg');
      }
      setIsCameraOpen(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div 
        className={`w-full p-5 border-2 border-dashed rounded-2xl text-center transition-all min-h-[190px] flex justify-center items-center relative overflow-hidden bg-white/70 backdrop-blur-sm ${
          isDragging 
            ? 'border-[#B7ACF5] bg-[#F4F1FD]/60 ring-4 ring-[#B7ACF5]/20' 
            : 'border-[#EAE7DF] hover:border-[#B7ACF5]/70 hover:bg-white/90'
        }`}
        onDrop={!isCameraOpen && !imagePreviewUrl ? handleDrop : undefined}
        onDragOver={!isCameraOpen && !imagePreviewUrl ? handleDragOver : undefined}
        onDragLeave={!isCameraOpen && !imagePreviewUrl ? handleDragLeave : undefined}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />

        {imagePreviewUrl ? (
          <div className="relative group max-h-72 w-full flex items-center justify-center p-2">
            <img 
              src={imagePreviewUrl} 
              alt="Evidence preview" 
              className="max-h-64 max-w-full rounded-xl object-contain shadow-sm border border-[#EAE7DF]" 
            />
          </div>
        ) : isCameraOpen ? (
          <div className="w-full flex flex-col items-center gap-4 py-2">
            <div className="relative w-full max-w-md mx-auto flex justify-center bg-stone-900 rounded-2xl overflow-hidden shadow-inner border border-stone-800">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-auto max-h-64 object-contain ${isHeatMapEnabled ? 'opacity-0 absolute inset-0' : 'opacity-100 relative'}`} 
              />
              <canvas 
                ref={canvasRef} 
                className={`w-full h-auto max-h-64 object-contain ${isHeatMapEnabled ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'}`} 
              />
            </div>
            
            <div className="w-full max-w-md flex flex-wrap items-center justify-between gap-3 px-1">
              <label className="flex items-center cursor-pointer gap-2 shrink-0 select-none">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={isHeatMapEnabled}
                    onChange={(e) => setIsHeatMapEnabled(e.target.checked)}
                  />
                  <div className={`block w-9 h-5 rounded-full transition-colors ${isHeatMapEnabled ? 'bg-[#9A8CE8]' : 'bg-[#EAE7DF]'}`}></div>
                  <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isHeatMapEnabled ? 'transform translate-x-4 shadow-sm' : ''}`}></div>
                </div>
                <span className="text-xs font-semibold text-[#171717] flex items-center gap-1">
                  <SparklesIcon className="w-3.5 h-3.5 text-[#9A8CE8]" />
                  Thermal Filter
                </span>
              </label>
              
              <button
                type="button"
                onClick={handleTakePhoto}
                className="px-5 py-2 rounded-xl bg-[#171717] text-white hover:bg-[#2e2e2e] text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
              >
                <CameraIcon className="w-4 h-4" />
                Capture Snapshot
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center space-y-2.5 text-[#858585] cursor-pointer w-full py-4"
            onClick={handleUploadClick}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#F8F7F3] border border-[#EAE7DF] flex items-center justify-center text-[#737373] group-hover:scale-105 transition-transform">
              <UploadIcon className="w-6 h-6 text-[#9A8CE8]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#171717]">Click to upload or drag & drop</p>
              <p className="text-xs text-[#858585]">Server logs, screenshot, hardware photo (PNG, JPG, WEBP)</p>
            </div>
          </div>
        )}
      </div>

      {!imagePreviewUrl && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsCameraOpen(!isCameraOpen)}
            className="text-xs font-semibold text-[#737373] hover:text-[#171717] px-3 py-1.5 rounded-full hover:bg-black/[0.03] transition-colors flex items-center gap-1.5"
          >
            <CameraIcon className="w-3.5 h-3.5" />
            {isCameraOpen ? 'Switch to File Upload' : 'Use Live Camera Device'}
          </button>
        </div>
      )}

      {cameraError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 text-center">
          {cameraError}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
