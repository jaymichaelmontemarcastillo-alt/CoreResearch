// src/components/ui/ImageCropModal.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Move,
  Crop,
  Sparkles,
} from "lucide-react";

export const ImageCropModal = ({
  isOpen,
  imageSrc,
  onClose,
  onApplyCrop,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Viewport crop diameter in pixels
  const CROP_SIZE = 260;

  // Reset adjustments whenever a new image is loaded or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle Drag / Pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel to zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to default
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Crop & Export Avatar Canvas
  const handleConfirmCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const outputCanvas = document.createElement("canvas");
    const outputSize = 400; // Output crisp 400x400 avatar
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext("2d");

    if (!ctx) return;

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Ratio between output size and viewport crop circle
    const ratio = outputSize / CROP_SIZE;

    // Center of canvas
    ctx.translate(outputSize / 2, outputSize / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply translation from user pan
    ctx.translate(position.x * ratio, position.y * ratio);

    // Apply zoom scale
    const drawWidth = img.naturalWidth * (CROP_SIZE / Math.min(img.naturalWidth, img.naturalHeight)) * scale * ratio;
    const drawHeight = img.naturalHeight * (CROP_SIZE / Math.min(img.naturalWidth, img.naturalHeight)) * scale * ratio;

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // Get cropped result as high quality JPEG/WebP data URL
    const croppedDataUrl = outputCanvas.toDataURL("image/jpeg", 0.92);
    onApplyCrop(croppedDataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Adjust Profile Photo
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Drag to reposition and zoom to adjust your picture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Crop Workspace */}
        <div className="p-6 flex flex-col items-center select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            } shadow-inner`}
          >
            {/* The draggable, scalable, rotatable image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={() => setImageLoaded(true)}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                maxWidth: "none",
                maxHeight: "none",
                width: "260px",
                height: "auto",
                transition: isDragging ? "none" : "transform 0.05s ease-out",
                userSelect: "none",
                pointerEvents: "none",
              }}
              className="object-contain"
            />

            {/* Circular Crop Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer Dimmed Layer with Circular Cutout */}
              <div
                className="w-[260px] h-[260px] rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] relative"
              >
                {/* Subtle alignment guide lines */}
                <div className="absolute inset-0 rounded-full border border-white/20" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -translate-x-1/2" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 -translate-y-1/2" />
              </div>
            </div>

            {/* Helper floating hint */}
            <div className="absolute bottom-2.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] text-white/80 pointer-events-none flex items-center gap-1.5 shadow-sm">
              <Move className="w-3 h-3" />
              <span>Drag to move • Scroll to zoom</span>
            </div>
          </div>

          {/* Controls Bar: Zoom & Rotate & Reset */}
          <div className="w-full max-w-sm mt-5 space-y-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <button
                type="button"
                onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotation and Reset Actions */}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition font-medium"
              >
                <RotateCw className="w-3.5 h-3.5 text-gray-500" />
                <span>Rotate 90°</span>
              </button>

              <span className="text-gray-400 font-mono text-[11px]">
                {Math.round(scale * 100)}% • {rotation}°
              </span>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmCrop}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply & Use Photo
          </button>
        </div>
      </div>
    </div>
  );
};
