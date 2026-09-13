import React, { useState, useEffect } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const OnlyOfficeEditor = ({ documentId, mode }) => {
  const [config, setConfig] = useState(null);
  const [documentServerUrl, setDocumentServerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        // 1. Fetch the runtime server config (ONLYOFFICE URL) from backend.
        //    This avoids baking the URL into the frontend build — no rebuild needed when tunnel changes!
        let serverUrl = import.meta.env.VITE_ONLYOFFICE_SERVER_URL || 'http://localhost:8080/';
        try {
          const configResponse = await api.get('/config');
          if (configResponse.data?.onlyofficeServerUrl) {
            serverUrl = configResponse.data.onlyofficeServerUrl;
          }
        } catch (configErr) {
          console.warn('[OnlyOfficeEditor] Could not fetch runtime config, using fallback URL:', serverUrl);
        }

        if (isMounted) setDocumentServerUrl(serverUrl);

        // 2. Fetch the ONLYOFFICE document config (JWT token, permissions, etc.)
        let response;
        const configUrl = `/onlyoffice/config/${documentId}${mode ? `?mode=${encodeURIComponent(mode)}` : ''}`;
        try {
          response = await api.get(configUrl);
        } catch (err) {
          // If document not found or not migrated, attempt to create/initialize it
          if (err.response && (err.response.status === 404 || err.response.status === 400)) {
            console.log('[OnlyOfficeEditor] Document not found, attempting to auto-create...');
            await api.post('/onlyoffice/create', { documentId, title: 'Research Manuscript' });
            response = await api.get(configUrl);
          } else {
            throw err;
          }
        }

        const data = response.data;

        if (data.success && isMounted) {
          const finalConfig = {
            ...data.config,
            token: data.token
          };
          setConfig(finalConfig);
        } else if (isMounted) {
          setError(data.message || 'Failed to load editor configuration');
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = err.response?.data?.message || 'Network error while loading editor configuration';
          setError(errMsg);
          console.error('[OnlyOfficeEditor] fetchConfig error:', err);
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
  }, [documentId]);

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
      <div className="flex flex-col items-center justify-center h-full w-full min-h-[500px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500">Loading ONLYOFFICE Document Server...</p>
      </div>
    );
  }

  if (error || loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center min-h-[500px] bg-slate-900/50 rounded-xl border border-slate-800 text-slate-200">
        <div className="text-amber-400 text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-white mb-2">ONLYOFFICE Document Server Offline</h3>
        <p className="text-slate-400 text-sm max-w-md mb-4">{loadError || error}</p>
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

  if (!config || !documentServerUrl) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col relative rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <DocumentEditor
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
