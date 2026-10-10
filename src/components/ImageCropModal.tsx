import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move, Check, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  aspectRatio: number; // e.g. 1 for avatar, 2.5 for banner
  isCircle?: boolean;
  title: string;
  onSave: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  aspectRatio,
  isCircle = false,
  title,
  onSave,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image object
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      renderPreview(img, zoom, panX, panY);
    };
  }, [imageSrc]);

  // Re-render when pan/zoom changes
  useEffect(() => {
    if (imageRef.current) {
      renderPreview(imageRef.current, zoom, panX, panY);
    }
  }, [zoom, panX, panY]);

  const renderPreview = (
    img: HTMLImageElement,
    currentZoom: number,
    offsetX: number,
    offsetY: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetWidth = 600;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.save();

    // Background filler
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Compute base scale to cover canvas
    const baseScale = Math.max(targetWidth / img.width, targetHeight / img.height);
    const finalScale = baseScale * currentZoom;

    const scaledWidth = img.width * finalScale;
    const scaledHeight = img.height * finalScale;

    // Centered coordinates + offsets
    const drawX = (targetWidth - scaledWidth) / 2 + offsetX;
    const drawY = (targetHeight - scaledHeight) / 2 + offsetY;

    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
    onSave(croppedUrl);
  };

  const nudge = (dx: number, dy: number) => {
    setPanX((prev) => prev + dx);
    setPanY((prev) => prev + dy);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-slate-900 text-white">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Move className="w-4 h-4 text-orange-400" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas / Preview Container */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
          <div
            className={`relative overflow-hidden cursor-grab active:cursor-grabbing border-2 border-orange-500/80 shadow-lg ${
              isCircle ? 'rounded-full aspect-square w-56' : 'rounded-xl w-full'
            }`}
            style={{
              aspectRatio: `${aspectRatio}`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            {/* Visual Guide Overlay */}
            <div className="absolute inset-0 border border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          </div>
          <span className="text-xs text-gray-400 mt-2">
            Geser gambar langsung atau gunakan tombol arah di bawah
          </span>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 bg-gray-50 flex-1 overflow-y-auto">
          {/* Zoom Control */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              aria-label="Tingkat Zoom Gambar"
              className="flex-1 accent-orange-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-medium text-gray-600 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* D-Pad Directional Arrows */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
            <span className="text-xs font-medium text-gray-600">Geser Posisi:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudge(-15, 0)}
                aria-label="Geser Kiri"
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => nudge(0, -15)}
                  aria-label="Geser Atas"
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-700"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => nudge(0, 15)}
                  aria-label="Geser Bawah"
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-700"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => nudge(15, 0)}
                aria-label="Geser Kanan"
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-700"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="text-xs text-orange-600 hover:underline font-medium"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-100 flex gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-98 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            SIMPAN CROP
          </button>
        </div>
      </div>
    </div>
  );
};
