
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-crop-image-and-provide-advice.ts';
import '@/ai/flows/store-ai-scan-results.ts';
import '@/ai/flows/analyze-sand-image-and-provide-advice.ts';
import '@/ai/flows/fetch-agri-news-and-weather.ts';
import '@/ai/flows/get-climate-disease-risk.ts';
import '@/ai/flows/agri-chatbot.ts';
import '@/ai/flows/calculate-carbon-credits.ts';
import '@/ai/flows/get-pesticide-insights.ts';
import '@/ai/flows/suggest-organic-alternative.ts';
