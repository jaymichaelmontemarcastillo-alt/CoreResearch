const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Serve test documents statically so ONLYOFFICE Document Server can download them
app.use('/documents', express.static(path.join(__dirname, '../test-documents')));

// Endpoint for ONLYOFFICE callback
app.post('/callback', (req, res) => {
    const body = req.body;
    console.log('[ONLYOFFICE Callback] Status:', body.status);

    // Status 2 means document is ready for saving
    if (body.status === 2 || body.status === 6) {
        const downloadUrl = body.url;
        console.log('[ONLYOFFICE Callback] Document ready to save. URL:', downloadUrl);
        // In a real scenario, we would download from downloadUrl and save it to GridFS/S3.
        // For POC, we just acknowledge.
    }
    
    // Must return {"error": 0} to acknowledge
    res.json({ error: 0 });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'ONLYOFFICE POC Backend running.' });
});

app.listen(PORT, () => {
    console.log(`[Backend] Listening on http://localhost:${PORT}`);
});
