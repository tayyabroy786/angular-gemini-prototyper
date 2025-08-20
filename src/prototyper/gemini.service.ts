import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY: string | undefined = process.env.GEMINI_API_KEY;

// Throw an error if the key is not defined.
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set. Please set it before running.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

export async function generateComponentCode(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  console.log('Sending prompt to Gemini...');
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text;
}

