const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'mysecret';

app.use(cors());
app.use(express.json());

const DOCS_DIR = path.join(__dirname, '../test-documents');

// Ensure directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Serve documents to ONLYOFFICE
app.get('/files/:filename', (req, res) => {
  const filePath = path.join(DOCS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Provide document configuration for the frontend
app.get('/config/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(DOCS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Determine IP address for backend URL that ONLYOFFICE can reach
  // For Docker on Windows/Mac, host.docker.internal works well.
  const backendUrl = `http://host.docker.internal:${PORT}`;

  const config = {
    document: {
      fileType: 'docx',
      key: `${filename}-${Date.now()}`,
      title: filename,
      url: `${backendUrl}/files/${filename}`
    },
    documentType: 'word',
    editorConfig: {
      callbackUrl: `${backendUrl}/track?filename=${filename}`,
      mode: 'edit'
    }
  };

  // Sign the config with JWT
  const token = jwt.sign(config, JWT_SECRET, { expiresIn: '1h' });
  config.token = token;

  res.json(config);
});

// ONLYOFFICE Document Server callback for saving
app.post('/track', async (req, res) => {
  const { filename } = req.query;
  const status = req.body.status;
  
  console.log(`Track request for ${filename} with status: ${status}`);

  if (status === 2 || status === 3 || status === 6) { // 2 = ready for saving, 6 = force saving
    const downloadUri = req.body.url;
    try {
      console.log(`Downloading saved file from ${downloadUri}...`);
      const response = await axios.get(downloadUri, { responseType: 'arraybuffer' });
      const filePath = path.join(DOCS_DIR, filename);
      fs.writeFileSync(filePath, response.data);
      console.log(`Successfully saved ${filename}`);
    } catch (error) {
      console.error(`Error saving document ${filename}:`, error.message);
      return res.json({ error: 1 });
    }
  }

  res.json({ error: 0 });
});

// List documents
app.get('/list', (req, res) => {
  fs.readdir(DOCS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(files.filter(f => f.endsWith('.docx')));
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
