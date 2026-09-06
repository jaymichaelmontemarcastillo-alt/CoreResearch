import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const docEditorRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3001/list')
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedDoc) return;

    if (docEditorRef.current) {
      docEditorRef.current.destroyEditor();
      docEditorRef.current = null;
    }

    fetch(`http://localhost:3001/config/${selectedDoc}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load document config');
        return res.json();
      })
      .then(config => {
        if (!window.DocsAPI) {
          throw new Error('ONLYOFFICE Docs API is not loaded');
        }
        
        docEditorRef.current = new window.DocsAPI.DocEditor('onlyoffice-editor', config);
      })
      .catch(err => {
        setError(err.message);
      });

    return () => {
      if (docEditorRef.current) {
        docEditorRef.current.destroyEditor();
        docEditorRef.current = null;
      }
    };
  }, [selectedDoc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>ONLYOFFICE POC - CoreResearch</h1>
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="doc-select" style={{ marginRight: '1rem' }}>Select Document:</label>
          <select 
            id="doc-select" 
            value={selectedDoc} 
            onChange={(e) => setSelectedDoc(e.target.value)}
            style={{ padding: '0.5rem', fontSize: '1rem' }}
          >
            <option value="">-- Select --</option>
            {documents.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>
        </div>
        {error && <div style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</div>}
      </header>
      
      <main style={{ flex: 1, position: 'relative' }}>
        <div id="onlyoffice-editor" style={{ width: '100%', height: '100%' }}></div>
      </main>
    </div>
  );
}

export default App;
