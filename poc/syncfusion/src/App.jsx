import React from 'react';
import { DocumentEditorContainerComponent, Toolbar } from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';

// Inject Toolbar module
DocumentEditorContainerComponent.Inject(Toolbar);

function App() {
  let containerRef = React.useRef(null);

  React.useEffect(() => {
    // Optionally load a default document here, but for now just show the editor
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ padding: '10px', margin: 0, backgroundColor: '#f0f0f0' }}>Syncfusion Document Editor POC</h2>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DocumentEditorContainerComponent
          ref={containerRef}
          id="container"
          height="100%"
          enableToolbar={true}
          // The serviceUrl is required for DOCX import/export. 
          // Syncfusion provides a public test server for evaluation purposes:
          serviceUrl="https://services.syncfusion.com/react/production/api/documenteditor/"
        />
      </div>
    </div>
  );
}

export default App;
