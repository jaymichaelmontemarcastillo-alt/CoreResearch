import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const onlineTimeoutRef = useRef(null);

  useEffect(() => {
    const handleOffline = () => {
      if (onlineTimeoutRef.current !== null) {
        clearTimeout(onlineTimeoutRef.current);
        onlineTimeoutRef.current = null;
      }
      setIsOffline(true);
      setShowBackOnline(false);
    };

    const handleOnline = () => {
      if (onlineTimeoutRef.current !== null) {
        clearTimeout(onlineTimeoutRef.current);
      }
      setIsOffline(false);
      setShowBackOnline(true);
      onlineTimeoutRef.current = setTimeout(() => {
        setShowBackOnline(false);
        onlineTimeoutRef.current = null;
      }, 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (onlineTimeoutRef.current !== null) {
        clearTimeout(onlineTimeoutRef.current);
      }
    };
  }, []);

  const isVisible = isOffline || showBackOnline;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!isVisible}
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border backdrop-blur transition-all duration-300 ease-out ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-12 opacity-0 pointer-events-none'
      } ${
        isOffline
          ? 'bg-red-600/95 shadow-red-600/20 border-red-500/50'
          : 'bg-emerald-600/95 shadow-emerald-600/20 border-emerald-500/50'
      }`}
    >
      {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
      {isOffline
        ? 'You are offline. Changes are saved locally.'
        : 'Back online. Syncing changes...'}
    </div>
  );
}
