import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

class DocumentAnalysisService {
  constructor() {
    this._ai = null;
  }

  get ai() {
    if (!this._ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[DocumentAnalysisService] GEMINI_API_KEY is not set.');
        return null;
      }
      this._ai = new GoogleGenAI({ apiKey });
    }
    return this._ai;
  }

  /**
   * Helper: basic DOCX text extraction
   */
  extractTextFromDocx(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const contentXml = zip.readAsText('word/document.xml');
      const parser = new XMLParser({
        ignoreAttributes: true,
        textNodeName: '_text',
      });
      const jsonObj = parser.parse(contentXml);
      
      let text = '';
      const extractStr = (obj) => {
        if (typeof obj === 'string') text += obj + ' ';
        else if (Array.isArray(obj)) obj.forEach(extractStr);
        else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(extractStr);
        }
      };
      
      if (jsonObj && jsonObj['w:document']) {
        extractStr(jsonObj['w:document']);
      }
      return text;
    } catch (e) {
      console.error('Failed to parse DOCX:', e);
      throw new Error('Invalid or corrupted DOCX file.');
    }
  }

  /**
   * Extracts clean text from PDF or DOCX buffers.
   */
  async extractText(fileBuffer, mimeType) {
    let extractedText = '';

    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: fileBuffer });
      const data = await parser.getText();
      extractedText = data.text;
    } else if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) {
      extractedText = this.extractTextFromDocx(fileBuffer);
    } else {
      throw new Error('Unsupported document format for text extraction. Only PDF and DOCX are supported.');
    }

    // Clean the text
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (!extractedText || extractedText.length < 100) {
      throw new Error('Unable to extract readable text from the document. The file may be image-only, scanned, or corrupted.');
    }

    // 1a. Reference Detection & Removal
    const refRegex = /\b(?:References|Bibliography|Works Cited|REFERENCES|BIBLIOGRAPHY)\b/g;
    let match;
    let lastRefIndex = -1;
    while ((match = refRegex.exec(extractedText)) !== null) {
        lastRefIndex = match.index;
    }
    
    let cleanText = extractedText;
    // Heuristic: If we found a reference marker in the last 40% of the document, truncate it
    if (lastRefIndex > extractedText.length * 0.6) {
        cleanText = extractedText.substring(0, lastRefIndex);
    }

    // 1b. Lightweight Section Detection
    const headings = ['Abstract', 'Introduction', 'Related Literature', 'Review of Related Literature', 'Methodology', 'Materials and Methods', 'Results', 'Discussion', 'Conclusion', 'Recommendations'];
    for (const heading of headings) {
        const regex = new RegExp(`(?<!\\w)(${heading})(?!\\w)`, 'gi');
        cleanText = cleanText.replace(regex, `\n\n[SECTION: $1]\n\n`);
    }

    return cleanText;
  }

  /**
   * Analyzes text using Gemini to extract structural NLP data.
   */
  async analyzeDocument(textToProcess) {
    if (!this.ai) {
      throw new Error('Gemini API key missing, cannot process NLP.');
    }

    const prompt = `
Analyze the following academic research document text and extract structured metadata.
Focus heavily on high-importance sections such as the Title, Abstract, Keywords, Methodology, and Conclusion.
Ignore references, author bios, formatting artifacts, and page headers/footers.
Identify the actual research concepts, methodologies, and specific domain keywords.
Do NOT extract generic academic terms like "system", "study", "research", "process", "data", "users".

DOCUMENT TEXT:
---
${textToProcess.substring(0, 15000)}
---
`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "The likely title of the research paper (if found at the beginning of the text, otherwise empty)" },
        abstract: { type: "STRING", description: "A 2-3 sentence summary of the research topic and problem." },
        keywords: { type: "ARRAY", items: { type: "STRING" }, description: "Specific keywords" },
        keyPhrases: { type: "ARRAY", items: { type: "STRING" }, description: "Multi-word phrases" },
        researchTopics: { type: "ARRAY", items: { type: "STRING" }, description: "Main research topics" },
        researchConcepts: { type: "ARRAY", items: { type: "STRING" }, description: "Important concepts" },
        methodologies: { type: "ARRAY", items: { type: "STRING" }, description: "Methodologies used" },
        researchDomain: { type: "STRING", description: "Broad research domain" },
        researchProblem: { type: "STRING", description: "The core problem addressed" }
      },
      required: ["abstract", "keywords", "researchTopics", "researchConcepts", "methodologies", "researchDomain", "researchProblem"]
    };

    let nlpData = null;
    let retries = 3;
    let lastError = null;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        });
        
        nlpData = JSON.parse(response.text);
        break; // Success
      } catch (err) {
        lastError = err;
        console.warn(`[DocumentAnalysisService] Gemini extraction failed (attempt ${i+1}):`, err.message);
        if (err.message.includes('API key')) throw err; // Don't retry missing key
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }

    if (!nlpData) {
      throw new Error(`Failed to extract NLP data after ${retries} attempts: ${lastError?.message}`);
    }

    return nlpData;
  }

  /**
   * Generates a single semantic embedding representing the document concepts.
   */
  async generateEmbedding(nlpData) {
    if (!this.ai) {
      throw new Error('Gemini API key missing, cannot process NLP.');
    }

    const combinedRepresentation = [
      nlpData.title || '',
      nlpData.abstract || '',
      ...(nlpData.researchTopics || []),
      ...(nlpData.keywords || []),
      ...(nlpData.keyPhrases || []),
      ...(nlpData.researchConcepts || []),
      ...(nlpData.methodologies || []),
      nlpData.researchDomain || '',
      nlpData.researchProblem || ''
    ].join(' ');

    let embedding = null;
    let retries = 3;
    let lastError = null;

    for (let i = 0; i < retries; i++) {
      try {
        const embeddingResponse = await this.ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: combinedRepresentation,
        });
        embedding = embeddingResponse.embeddings[0].values;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[DocumentAnalysisService] Gemini embedding failed (attempt ${i+1}):`, err.message);
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
      }
    }

    if (!embedding) {
      throw new Error(`Failed to generate embedding after ${retries} attempts: ${lastError?.message}`);
    }

    return { embedding, embeddingDimensions: embedding.length };
  }
}

export const documentAnalysisService = new DocumentAnalysisService();
export default documentAnalysisService;
