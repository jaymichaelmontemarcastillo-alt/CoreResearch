import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { HiXMark, HiDocumentText, HiCheck } from 'react-icons/hi2';
import { DEFAULT_PAGE_SETTINGS } from '../../services/documentStore';

const MARGIN_PRESETS = [
  {
    name: 'Normal',
    top: '1in',
    bottom: '1in',
    left: '1in',
    right: '1in',
    desc: '1 in (25.4 mm) on all sides'
  },
  {
    name: 'Narrow',
    top: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
    right: '0.5in',
    desc: '0.5 in (12.7 mm) on all sides'
  },
  {
    name: 'Moderate',
    top: '1in',
    bottom: '1in',
    left: '0.75in',
    right: '0.75in',
    desc: '1 in top/bottom, 0.75 in left/right'
  },
  {
    name: 'Wide',
    top: '1in',
    bottom: '1in',
    left: '1.5in',
    right: '1.5in',
    desc: '1 in top/bottom, 1.5 in left/right'
  }
];

export const PageSettingsModal = ({ isOpen, onClose, pageSettings, onSaveSettings }) => {
  const [size, setSize] = useState(pageSettings?.size || DEFAULT_PAGE_SETTINGS.size);
  const [orientation, setOrientation] = useState(pageSettings?.orientation || DEFAULT_PAGE_SETTINGS.orientation);
  const [marginTop, setMarginTop] = useState(pageSettings?.marginTop || DEFAULT_PAGE_SETTINGS.marginTop);
  const [marginBottom, setMarginBottom] = useState(pageSettings?.marginBottom || DEFAULT_PAGE_SETTINGS.marginBottom);
  const [marginLeft, setMarginLeft] = useState(pageSettings?.marginLeft || DEFAULT_PAGE_SETTINGS.marginLeft);
  const [marginRight, setMarginRight] = useState(pageSettings?.marginRight || DEFAULT_PAGE_SETTINGS.marginRight);

  useEffect(() => {
    if (pageSettings) {
      setSize(pageSettings.size || DEFAULT_PAGE_SETTINGS.size);
      setOrientation(pageSettings.orientation || DEFAULT_PAGE_SETTINGS.orientation);
      setMarginTop(pageSettings.marginTop || DEFAULT_PAGE_SETTINGS.marginTop);
      setMarginBottom(pageSettings.marginBottom || DEFAULT_PAGE_SETTINGS.marginBottom);
      setMarginLeft(pageSettings.marginLeft || DEFAULT_PAGE_SETTINGS.marginLeft);
      setMarginRight(pageSettings.marginRight || DEFAULT_PAGE_SETTINGS.marginRight);
    }
  }, [pageSettings, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setMarginTop(preset.top);
    setMarginBottom(preset.bottom);
    setMarginLeft(preset.left);
    setMarginRight(preset.right);
  };

  const handleSave = () => {
    const newSettings = {
      size,
      orientation,
      marginTop: marginTop.trim() || '1in',
      marginBottom: marginBottom.trim() || '1in',
      marginLeft: marginLeft.trim() || '1in',
      marginRight: marginRight.trim() || '1in',
    };
    onSaveSettings(newSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <HiDocumentText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Page Setup & Margins</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Orientation */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Orientation
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${
                  orientation === 'portrait'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-4 h-5 border-2 border-current rounded-sm" />
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${
                  orientation === 'landscape'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-5 h-4 border-2 border-current rounded-sm" />
                Landscape
              </button>
            </div>
          </div>

          {/* Paper Size */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Paper Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="letter">Letter (8.5 × 11 inches / 216 × 279 mm)</option>
              <option value="a4">A4 (8.27 × 11.69 inches / 210 × 297 mm)</option>
              <option value="legal">Legal (8.5 × 14 inches / 216 × 356 mm)</option>
            </select>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Margins (Presettings)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {MARGIN_PRESETS.map((preset) => {
                const isSelected = marginTop === preset.top && marginBottom === preset.bottom && marginLeft === preset.left && marginRight === preset.right;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{preset.name}</span>
                      {isSelected && <HiCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-gray-400 block truncate">{preset.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Margins Input */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Top Margin</label>
                <Input
                  type="text"
                  value={marginTop}
                  onChange={(e) => setMarginTop(e.target.value)}
                  placeholder="1in"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Bottom Margin</label>
                <Input
                  type="text"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(e.target.value)}
                  placeholder="1in"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Left Margin</label>
                <Input
                  type="text"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(e.target.value)}
                  placeholder="1in"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Right Margin</label>
                <Input
                  type="text"
                  value={marginRight}
                  onChange={(e) => setMarginRight(e.target.value)}
                  placeholder="1in"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Apply Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
