import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function testEmbedding() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const modelsToTest = ['text-embedding-004', 'gemini-embedding-2', 'gemini-embedding-001', 'embedding-001', 'text-embedding-004'];
    
    console.log(`Starting test with GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Present' : 'Missing'}`);
    
    // Actually the user explicitly wants me to test `gemini-embedding-2` per their constraint: "verify ... gemini-embedding-2 is available"
    const model = 'gemini-embedding-2';
    
    console.log(`Testing model: ${model}`);
    const response = await ai.models.embedContent({
      model: model,
      contents: 'This is a test of the CoreResearch embedding migration.',
    });
    
    if (response && response.embeddings && response.embeddings[0]) {
      console.log('SUCCESS!');
      console.log('Model:', model);
      console.log('Dimension size:', response.embeddings[0].values.length);
      console.log('Sample vector:', response.embeddings[0].values.slice(0, 3));
    } else {
      console.log('Response succeeded but missing embeddings format:', JSON.stringify(response));
    }
  } catch (error) {
    console.error(`FAILED for model gemini-embedding-2:`, error.message);
    if (error.status) console.error('Status:', error.status);
    console.error('Full Error:', JSON.stringify(error));
  }
}

testEmbedding();
