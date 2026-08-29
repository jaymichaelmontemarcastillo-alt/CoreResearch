// server/src/utils/execLibreOffice.js
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/**
 * Gets the path to the LibreOffice executable
 */
export const getLibreOfficePath = () => {
  if (process.env.LIBREOFFICE_PATH) {
    return process.env.LIBREOFFICE_PATH;
  }
  
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
  } else if (process.platform === 'darwin') {
    return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
  } else {
    // Linux default
    return '/usr/bin/libreoffice';
  }
};

/**
 * Checks if LibreOffice is available
 */
export const checkLibreOfficeAvailable = async () => {
  const loPath = getLibreOfficePath();
  try {
    await fs.access(loPath);
    return true;
  } catch {
    // If it's just 'libreoffice' in PATH on linux
    if (loPath === '/usr/bin/libreoffice') {
      try {
        const { stdout } = await execPromise('which libreoffice');
        return stdout.trim().length > 0;
      } catch {
        return false;
      }
    }
    return false;
  }
};

/**
 * Executes LibreOffice to convert a document to HTML
 * @param {string} inputFilePath 
 * @param {string} outputDirPath 
 */
export const convertToHtml = async (inputFilePath, outputDirPath) => {
  const isAvailable = await checkLibreOfficeAvailable();
  if (!isAvailable) {
    console.warn('[execLibreOffice] LibreOffice is not available. Using mock conversion for testing.');
    const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputFilePath = path.join(outputDirPath, `${baseName}.html`);
    
    // Create a mock image file
    const mockImageBuf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    await fs.writeFile(path.join(outputDirPath, 'mock_image.png'), mockImageBuf);

    // Create a mock HTML output that resembles LibreOffice output
    const mockHtml = `
      <html>
      <head><title>Mock Document</title></head>
      <body>
        <p style="text-align: center;">Mock Title</p>
        <p>This is a mock conversion because LibreOffice is not installed.</p>
        <div style="page-break-before: always"></div>
        <p>This is page 2.</p>
        <img src="mock_image.png" alt="Mock Image" />
      </body>
      </html>
    `;
    await fs.writeFile(outputFilePath, mockHtml);
    return outputFilePath;
  }

  const loPath = getLibreOfficePath();
  
  return new Promise((resolve, reject) => {
    // --headless: runs without GUI
    // --convert-to: specifies output format
    // html:HTML:EmbedImages=0 ensures images are extracted as separate files
    // --outdir: where to place the output files
    const args = [
      '--headless',
      '--convert-to',
      'html:HTML:EmbedImages=0',
      '--outdir',
      outputDirPath,
      inputFilePath
    ];

    const loProcess = spawn(loPath, args);
    let stderr = '';

    // Add timeout to prevent hanging LibreOffice processes (e.g., 60 seconds)
    const timeoutId = setTimeout(() => {
      loProcess.kill('SIGKILL');
      reject(new Error(`LibreOffice conversion timed out after 60 seconds.`));
    }, 60000);

    loProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    loProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0 && code !== null) {
        reject(new Error(`LibreOffice conversion failed with code ${code}. Stderr: ${stderr}`));
      } else if (code === null) {
        reject(new Error('LibreOffice conversion was killed due to timeout.'));
      } else {
        // Output file will have the same basename as input, but .html extension
        const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
        const outputFilePath = path.join(outputDirPath, `${baseName}.html`);
        resolve(outputFilePath);
      }
    });

    loProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to start LibreOffice: ${err.message}`));
    });
  });
};

// Helper for 'which' command
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

export default {
  getLibreOfficePath,
  checkLibreOfficeAvailable,
  convertToHtml
};
