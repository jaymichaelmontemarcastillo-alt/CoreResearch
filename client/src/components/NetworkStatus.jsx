import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };
    
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      // Hide the "Back online" message after 3 seconds
      setTimeout(() => setShowBackOnline(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-red-600/95 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg shadow-red-600/20 text-sm font-medium border border-red-500/50"
        >
          <WifiOff size={16} />
          You are offline. Changes are saved locally.
        </motion.div>
      )}

      {showBackOnline && !isOffline && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-emerald-600/95 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg shadow-emerald-600/20 text-sm font-medium border border-emerald-500/50"
        >
          <Wifi size={16} />
          Back online. Syncing changes...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
