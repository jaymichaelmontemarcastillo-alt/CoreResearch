import React, { useState, useEffect } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const OnlyOfficeEditor = ({ documentId }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        let response;
        try {
          response = await api.get(`/onlyoffice/config/${documentId}`);
        } catch (err) {
          // If document not found or not migrated, attempt to create/initialize it
          if (err.response && (err.response.status === 404 || err.response.status === 400)) {
            console.log('[OnlyOfficeEditor] Document not found, attempting to auto-create...');
            await api.post('/onlyoffice/create', { documentId, title: 'Research Manuscript' });
            response = await api.get(`/onlyoffice/config/${documentId}`);
          } else {
            throw err;
          }
        }

        const data = response.data;

        if (data.success && isMounted) {
          // Add the JWT token to the config object itself, as required by ONLYOFFICE
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

  const onDocumentReady = () => {
    console.log('[ONLYOFFICE] Document is loaded and ready.');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full min-h-[500px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500">Loading ONLYOFFICE Document Server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center min-h-[500px]">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Editor Initialization Failed</h3>
        <p className="text-slate-600 mb-4">{error}</p>
        <div className="text-left text-xs text-slate-400 bg-slate-50 p-4 rounded mt-4 max-w-lg overflow-auto">
          <p><strong>Debug Info:</strong></p>
          <p>Document ID: {documentId}</p>
          <p>API Endpoint: /api/onlyoffice/config/{documentId}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  // documentServerUrl must point to the ONLYOFFICE server (e.g., http://localhost:8080 or docker IP)
  const documentServerUrl = import.meta.env.VITE_ONLYOFFICE_SERVER_URL || 'http://localhost:8080/';

  return (
    <div className="w-full h-full flex flex-col relative rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <DocumentEditor
        id="onlyoffice-editor"
        documentServerUrl={documentServerUrl}
        config={config}
        events_onDocumentReady={onDocumentReady}
        height="100%"
      />
    </div>
  );
};
