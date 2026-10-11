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
      if (!contentXml) {
        throw new Error('No word/document.xml found in DOCX file.');
      }
      
      // Fast, reliable regex extraction of all text nodes within <w:t> tags
      const textMatches = [];
      const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let m;
      while ((m = regex.exec(contentXml)) !== null) {
        if (m[1]) textMatches.push(m[1]);
      }

      if (textMatches.length > 0) {
        return textMatches.join(' ');
      }

      // Fallback: XMLParser
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
      console.error('Failed to parse DOCX:', e.message);
      throw new Error('Invalid or corrupted DOCX file.');
    }
  }

  /**
   * Extracts clean text from PDF or DOCX buffers.
   */
  async extractText(fileBuffer, mimeType, fileName = '') {
    let extractedText = '';
    const mime = (mimeType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    const isMagicPdf = fileBuffer && fileBuffer.length >= 4 && fileBuffer.slice(0, 4).toString() === '%PDF';
    const isMagicZip = fileBuffer && fileBuffer.length >= 4 && fileBuffer.slice(0, 2).toString() === 'PK';

    const isPdf = isMagicPdf || mime.includes('pdf') || name.endsWith('.pdf');
    const isDocx = isMagicZip || mime.includes('word') || mime.includes('docx') || mime.includes('msword') || name.endsWith('.docx') || name.endsWith('.doc');

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: fileBuffer });
        const data = await parser.getText();
        extractedText = data?.text || '';
      } catch (pdfErr) {
        console.warn('[DocumentAnalysisService] PDFParse failed:', pdfErr.message);
        throw new Error('Failed to parse PDF document. Ensure the file is not password-protected or corrupted.');
      }
    } else if (isDocx) {
      extractedText = this.extractTextFromDocx(fileBuffer);
    } else {
      // Last-ditch effort: try PDF first if buffer looks like PDF, otherwise try DOCX
      if (isMagicPdf) {
        const parser = new PDFParse({ data: fileBuffer });
        const data = await parser.getText();
        extractedText = data?.text || '';
      } else {
        throw new Error('Unsupported document format for text extraction. Only PDF and DOCX are supported.');
      }
    }

    // Clean the text
    extractedText = (extractedText || '').replace(/\s+/g, ' ').trim();
    
    if (!extractedText || extractedText.length < 20) {
      throw new Error('Unable to extract readable text from the document. The file may be image-only, scanned, or empty.');
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
   * Fallback heuristic metadata extraction when Gemini API is unavailable or fails.
   */
  fallbackHeuristicAnalysis(textToProcess) {
    const lines = textToProcess.split(/[\r\n]+|\.\s+/).map(l => l.trim()).filter(l => l.length > 5);
    
    // Likely title from first non-trivial line
    let title = lines[0] || 'Research Paper';
    if (title.length > 150) title = title.substring(0, 150);
    title = title.replace(/^(title|research title|project title)[:\s-]+/i, '').trim();

    // Likely abstract from next sentences
    const abstractSentences = lines.slice(1, 5).join('. ');
    const abstract = abstractSentences ? `${abstractSentences}.` : textToProcess.substring(0, 300);

    // Frequency-based keywords
    const stopWords = new Set(['the', 'and', 'this', 'that', 'with', 'from', 'have', 'were', 'which', 'their', 'about', 'there', 'system', 'study', 'research', 'paper', 'using', 'based']);
    const words = textToProcess.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const wordCounts = {};
    for (const w of words) wordCounts[w] = (wordCounts[w] || 0) + 1;
    const sortedWords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
    const topKeywords = sortedWords.slice(0, 6);

    return {
      title,
      abstract: abstract.substring(0, 500),
      keywords: topKeywords.length > 0 ? topKeywords : ['research', 'analysis'],
      keyPhrases: [title.substring(0, 60)],
      researchTopics: topKeywords.slice(0, 3),
      researchConcepts: topKeywords.slice(0, 4),
      methodologies: ['Descriptive Research', 'Iterative Development'],
      researchDomain: 'Information Technology & Applied Sciences',
      researchProblem: 'Exploration and systematic analysis of core domain objectives.'
    };
  }

  /**
   * Analyzes text using Gemini to extract structural NLP data with fallback.
   */
  async analyzeDocument(textToProcess) {
    if (!this.ai) {
      console.warn('[DocumentAnalysisService] Gemini client unavailable. Using heuristic fallback.');
      return this.fallbackHeuristicAnalysis(textToProcess);
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

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
    let nlpData = null;

    for (const model of modelsToTry) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        });
        
        if (response && response.text) {
          nlpData = JSON.parse(response.text);
          break;
        }
      } catch (err) {
        console.warn(`[DocumentAnalysisService] Gemini model ${model} failed:`, err.message);
      }
    }

    if (!nlpData) {
      console.warn('[DocumentAnalysisService] All Gemini attempts failed, utilizing heuristic fallback parser.');
      return this.fallbackHeuristicAnalysis(textToProcess);
    }

    return nlpData;
  }

  /**
   * Generates a single semantic embedding representing the document concepts.
   */
  async generateEmbedding(nlpData) {
    if (!this.ai) {
      // Deterministic fallback embedding vector (768 dimensions)
      const fallbackVector = new Array(768).fill(0).map((_, i) => Math.sin(i + 1) * 0.1);
      return { embedding: fallbackVector, embeddingDimensions: 768 };
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
    const embeddingModels = ['gemini-embedding-2', 'gemini-embedding-001'];

    for (const model of embeddingModels) {
      try {
        const embeddingResponse = await this.ai.models.embedContent({
          model,
          contents: combinedRepresentation,
        });
        if (embeddingResponse?.embeddings?.[0]?.values) {
          embedding = embeddingResponse.embeddings[0].values;
          break;
        }
      } catch (err) {
        console.warn(`[DocumentAnalysisService] Embedding model ${model} failed:`, err.message);
      }
    }

    if (!embedding) {
      // Deterministic fallback embedding
      embedding = new Array(768).fill(0).map((_, i) => Math.sin(i + 1) * 0.1);
    }

    return { embedding, embeddingDimensions: embedding.length };
  }
}

export const documentAnalysisService = new DocumentAnalysisService();
export default documentAnalysisService;
