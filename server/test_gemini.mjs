import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.list();
    for await (const model of response) {
      console.log(model.name, model.supportedGenerationMethods);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
