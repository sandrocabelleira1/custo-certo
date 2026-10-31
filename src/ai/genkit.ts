import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
  model: process.env.GEMINI_MODEL || 'googleai/gemini-flash-lite-latest',
});
