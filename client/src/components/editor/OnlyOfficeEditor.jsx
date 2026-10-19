import React, { useState, useEffect, useRef } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

/**
 * Detects whether the client is a real mobile/tablet device or has a small mobile viewport.
 */
const isMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  
  // Standard mobile operating systems in User Agent
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  
  // iPad on iOS 13+ reports as Macintosh, but has multi-touch
  const isIPad = /Macintosh/i.test(ua) && Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

  const isSmallScreen = typeof window.innerWidth === 'number' && window.innerWidth < 768;

  return isMobileUA || isIPad || isSmallScreen;
};

/**
 * Selects ONLYOFFICE's platform interface type ('desktop' | 'mobile').
 * - In ONLYOFFICE Community Edition, passing 'mobile' triggers an abrupt technical warning:
 *   "Using the free Community version, you can open documents for viewing only. To access mobile web editors, a commercial license is required."
 * - Defaulting to 'desktop' bypasses this license restriction popup, allowing smooth document access,
 *   while CoreResearch presents a clean, friendly notification recommending desktop use.
 * - Supports URL override via ?editorType=desktop or ?editorType=mobile if explicitly needed.
 */
const getEditorType = () => {
  if (typeof window === 'undefined') return 'desktop';

  // Explicit override via URL parameter (e.g. ?editorType=mobile or ?editorType=desktop)
  try {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('editorType');
    if (forced === 'desktop' || forced === 'mobile') {
      return forced;
    }
  } catch {}

  // Always default to 'desktop' to prevent ONLYOFFICE Community Edition commercial license warning on mobile
  return 'desktop';
};

// Session-level memoization of runtime server configuration
let cachedServerConfigPromise = null;

const getRuntimeServerUrl = () => {
  if (!cachedServerConfigPromise) {
    cachedServerConfigPromise = api.get('/config')
      .then(res => res.data?.onlyofficeServerUrl || null)
      .catch(err => {
        console.warn('[OnlyOfficeEditor] Runtime config fetch fallback:', err.message);
        return null;
      });
  }
  return cachedServerConfigPromise;
};

export const OnlyOfficeEditor = ({ documentId, mode, workspace, tasks }) => {
  const [config, setConfig] = useState(null);
  const [documentServerUrl, setDocumentServerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showMobileNotice, setShowMobileNotice] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (mobile) {
      try {
        const dismissed = sessionStorage.getItem('dismissed_onlyoffice_mobile_modal');
        if (!dismissed) {
          setShowMobileModal(true);
        }
      } catch {}
    }
  }, []);

  const workspaceRef = useRef(workspace);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        let serverUrl = import.meta.env.VITE_ONLYOFFICE_SERVER_URL || 'http://localhost:8080/';
        const configUrl = `/onlyoffice/config/${documentId}${mode ? `?mode=${encodeURIComponent(mode)}` : ''}`;

        // Fetch runtime server URL and document config in parallel
        const [cachedUrl, docConfigResult] = await Promise.all([
          getRuntimeServerUrl(),
          api.get(configUrl).catch(err => ({ error: err }))
        ]);

        if (cachedUrl) {
          serverUrl = cachedUrl;
        }

        if (isMounted) setDocumentServerUrl(serverUrl);

        // Process document config
        if (!docConfigResult.error && docConfigResult.data) {
          const data = docConfigResult.data;
          if (data.success && isMounted) {
            const finalConfig = {
              ...data.config,
              type: getEditorType(),
              token: data.token
            };
            setConfig(finalConfig);
          } else if (isMounted) {
            setError(data.message || 'Failed to load editor configuration');
          }
        } else {
          // Request had an error
          if (isMounted) {
            const err = docConfigResult.error;
            const errMsg = err?.response?.data?.message || 'Network error while loading editor configuration';
            setError(errMsg);
            console.error('[OnlyOfficeEditor] fetchConfig error:', err);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Unexpected error while initializing editor');
          console.error('[OnlyOfficeEditor] Unexpected error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (documentId) {
      fetchConfig();
    }

    return () => {
      isMounted = false;
    };
  }, [documentId, mode]);

  const [loadError, setLoadError] = useState(null);

  const onDocumentReady = () => {
    console.log('[ONLYOFFICE] Document is loaded and ready.');
  };

  const onLoadComponentError = (errorCode, errorDescription) => {
    console.warn('[OnlyOfficeEditor] DocsAPI load error:', errorCode, errorDescription);
    setLoadError(
      `Unable to reach ONLYOFFICE Document Server at ${documentServerUrl}. Please ensure Docker Desktop is started and the ONLYOFFICE container is running on port 8080.`
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full min-h-[240px] sm:min-h-[500px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500">Loading ONLYOFFICE Document Server...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center min-h-[500px] bg-slate-900/50 rounded-xl border border-slate-800 text-slate-200">
        <div className="text-amber-400 text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-white mb-2">ONLYOFFICE Document Server Offline</h3>
        <p className="text-slate-400 text-sm max-w-md mb-4">{loadError}</p>
        <div className="text-left text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 max-w-lg space-y-2 text-slate-300">
          <p className="font-semibold text-white">How to fix this:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Open <strong className="text-white">Docker Desktop</strong> on your computer.</li>
            <li>In terminal, start the ONLYOFFICE container:</li>
          </ol>
          <code className="block p-2 rounded bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-[11px]">
            docker run -i -t -d -p 8080:80 --restart=always onlyoffice/documentserver
          </code>
          <p className="text-[11px] text-slate-500">
            Or if using a tunnel URL, set <span className="text-blue-300">VITE_ONLYOFFICE_SERVER_URL</span> in your client environment file.
          </p>
        </div>
        <button
          onClick={() => { setLoadError(null); setError(null); window.location.reload(); }}
          className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center min-h-[500px] bg-slate-50 rounded-xl border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
        <div className="text-red-500 text-5xl mb-4">📄</div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Could Not Open Document</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mb-4">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!config || !documentServerUrl) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-white dark:bg-slate-900">
      {/* Friendly Light Recommendation Banner for Mobile Devices */}
      {isMobile && showMobileNotice && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 text-xs text-amber-200 flex items-center justify-between z-20 backdrop-blur-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">💻</span>
            <span className="truncate sm:whitespace-normal">
              <strong>Desktop Recommended:</strong> Using the ONLYOFFICE Editor is recommended on a desktop or laptop computer.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileNotice(false)}
            aria-label="Dismiss notice"
            className="ml-2 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 transition-colors shrink-0"
          >
            Got it
          </button>
        </div>
      )}

      {/* Friendly Light Modal on Initial Mobile Open */}
      {isMobile && showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl text-blue-400">
              💻
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Desktop Recommended</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Using the ONLYOFFICE Editor is recommended on a desktop or laptop computer for the best editing, formatting, and review experience.
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                You can still view and review your manuscript on mobile, but full editing tools are optimized for desktop screens.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMobileModal(false);
                  try {
                    sessionStorage.setItem('dismissed_onlyoffice_mobile_modal', 'true');
                  } catch {}
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Continue on Mobile
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Go Back to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentEditor
        key={`${documentId}-${documentServerUrl}`}
        id="onlyoffice-editor"
        documentServerUrl={documentServerUrl}
        config={config}
        events_onDocumentReady={onDocumentReady}
        onLoadComponentError={onLoadComponentError}
        height="100%"
      />
    </div>
  );
};
