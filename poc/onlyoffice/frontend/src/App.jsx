import React, { useRef } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';

function App() {
  const onDocumentReady = () => {
    console.log("Document is loaded");
  };

  const onLoadComponentError = (errorCode, errorDescription) => {
    console.error("ONLYOFFICE Error:", errorCode, errorDescription);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ padding: '10px', margin: 0, backgroundColor: '#f0f0f0' }}>ONLYOFFICE Docs POC</h2>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DocumentEditor
          id="docxEditor"
          documentServerUrl="http://localhost:8080/"
          config={{
            document: {
              fileType: "docx",
              key: "test-document-" + Date.now(),
              title: "test.docx",
              // MUST BE ACCESSIBLE BY THE DOCUMENT SERVER (DOCKER CONTAINER).
              // Since Docker runs in its own network, 'localhost' points to the container itself.
              // To reach the host's Node backend on Windows, we usually use host.docker.internal
              url: "http://host.docker.internal:4000/documents/test.docx",
            },
            documentType: "word",
            editorConfig: {
              mode: "edit",
              callbackUrl: "http://host.docker.internal:4000/callback",
              user: {
                id: "user_1",
                name: "Test User 1"
              }
            },
          }}
          events_onDocumentReady={onDocumentReady}
          onLoadComponentError={onLoadComponentError}
        />
      </div>
    </div>
  );
}

export default App;
