import React, { useRef, useEffect } from 'react';
import WebViewer from '@pdftron/webviewer';

function App() {
  const viewer = useRef(null);

  useEffect(() => {
    WebViewer(
      {
        path: '/webviewer',
        // Optional: Provide a URL to load immediately. 
        // We will leave it empty so the user can use the upload button to load the manuscript.
        initialDoc: '',
        enableOfficeEditing: true, // Crucial for DOCX editing
      },
      viewer.current
    ).then((instance) => {
      const { UI, Core } = instance;
      
      // Enable DOCX Editing mode
      UI.enableFeatures([UI.Feature.OfficeEditing]);

      console.log('Apryse WebViewer initialized!');
    });
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ padding: '10px', margin: 0, backgroundColor: '#f0f0f0' }}>Apryse WebViewer POC</h2>
      <div style={{ flex: 1, overflow: 'hidden' }} ref={viewer}></div>
    </div>
  );
}

export default App;
