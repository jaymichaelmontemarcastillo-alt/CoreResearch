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
    desc: '1 in on all sides'
  },
  {
    name: 'Narrow',
    top: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
    right: '0.5in',
    desc: '0.5 in on all sides'
  },
  {
    name: 'Moderate',
    top: '1in',
    bottom: '1in',
    left: '0.75in',
    right: '0.75in',
    desc: '1 in top/bottom, 0.75 in L/R'
  },
  {
    name: 'Wide',
    top: '1in',
    bottom: '1in',
    left: '1.5in',
    right: '1.5in',
    desc: '1 in top/bottom, 1.5 in L/R'
  }
];

export const PageSettingsPanel = ({ pageSettings, onSaveSettings, onClose }) => {
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
  }, [pageSettings]);

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
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden w-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <HiDocumentText className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Page Setup
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Close Page Setup"
        >
          <HiXMark className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
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
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          >
            <option value="letter">Letter (8.5 × 11 in)</option>
            <option value="a4">A4 (8.27 × 11.69 in)</option>
            <option value="legal">Legal (8.5 × 14 in)</option>
          </select>
          {pageSettings?.widthMm && pageSettings?.heightMm && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
              <span className="font-medium text-gray-700 dark:text-gray-300">Exact Dimensions:</span> {pageSettings.widthMm}mm × {pageSettings.heightMm}mm
            </div>
          )}
        </div>

        {/* Margins */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Margins (Presets)
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MARGIN_PRESETS.map((preset) => {
              const isSelected = marginTop === preset.top && marginBottom === preset.bottom && marginLeft === preset.left && marginRight === preset.right;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span>{preset.name}</span>
                    {isSelected && <HiCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">{preset.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Margins Input */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Top Margin</label>
              <Input
                type="text"
                value={marginTop}
                onChange={(e) => setMarginTop(e.target.value)}
                placeholder="1in"
                className="text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Bottom Margin</label>
              <Input
                type="text"
                value={marginBottom}
                onChange={(e) => setMarginBottom(e.target.value)}
                placeholder="1in"
                className="text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Left Margin</label>
              <Input
                type="text"
                value={marginLeft}
                onChange={(e) => setMarginLeft(e.target.value)}
                placeholder="1in"
                className="text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Right Margin</label>
              <Input
                type="text"
                value={marginRight}
                onChange={(e) => setMarginRight(e.target.value)}
                placeholder="1in"
                className="text-sm py-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0">
        <Button variant="primary" size="sm" onClick={handleSave} className="w-full justify-center">
          Apply Settings
        </Button>
      </div>
    </div>
  );
};
