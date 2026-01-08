'use server';
/**
 * @fileOverview An AI agent that fetches and generates weather and agricultural news.
 *
 * - fetchAgriNewsAndWeather - A function that returns simulated weather and news data.
 * - AgriNewsAndWeatherOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AgriNewsAndWeatherInputSchema = z.object({
  location: z.string().describe('The state in India for which to fetch news and weather.'),
});
export type AgriNewsAndWeatherInput = z.infer<typeof AgriNewsAndWeatherInputSchema>;

const WeatherDataSchema = z.object({
  temperature: z.string().describe('The current temperature, e.g., "28°C".'),
  condition: z.string().describe('A brief weather condition description, e.g., "Partly Cloudy".'),
  humidity: z.string().describe('The current humidity level, e.g., "75%".'),
  wind: z.string().describe('The current wind speed and direction, e.g., "12 km/h SW".'),
});

const NewsArticleSchema = z.object({
  id: z.string().describe('A unique identifier for the news article.'),
  title: z.string().describe('The headline of the news article.'),
  summary: z.string().describe('A one-paragraph summary of the news article.'),
  source: z.string().describe('The source of the news, e.g., "Agri News India".'),
  publishedDate: z.string().describe('The publication date in ISO 8601 format.'),
  category: z.enum(['Climate News', 'Crop Disease Alerts', 'Government Policy']).describe('The category of the news.'),
  imageUrl: z.string().url().describe('A relevant placeholder image URL for the article.'),
  imageDescription: z.string().describe('A brief description of the image for alt text.'),
});

const AgriNewsAndWeatherOutputSchema = z.object({
  weather: WeatherDataSchema,
  news: z.array(NewsArticleSchema),
});
export type AgriNewsAndWeatherOutput = z.infer<typeof AgriNewsAndWeatherOutputSchema>;

export async function fetchAgriNewsAndWeather(
  input: AgriNewsAndWeatherInput
): Promise<AgriNewsAndWeatherOutput> {
  return fetchAgriNewsAndWeatherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fetchAgriNewsAndWeatherPrompt',
  input: { schema: AgriNewsAndWeatherInputSchema },
  output: { schema: AgriNewsAndWeatherOutputSchema },
  prompt: `You are an agricultural news and weather simulation agent for India.
Given a specific Indian state, generate a realistic-looking weather report and a set of 5 news articles.
The news articles should be relevant to farmers in that state.
The publication dates for all articles should be recent, within the last 7 days.
The current date is ${new Date().toISOString()}.

- Generate 1 article about climate change's impact on agriculture in the region.
- Generate 2 articles about current, plausible (but fictional) crop disease alerts for crops commonly grown in that state.
- Generate 2 articles about recent (fictional) government policies, subsidies, or decisions affecting farmers in the state.

For example, if the state is Maharashtra, you might mention diseases affecting sugarcane, and government decisions on water usage or crop insurance.

For each article, provide a relevant placeholder image URL from picsum.photos.
The seed for the image MUST be a single, URL-safe keyword that is highly specific to the article's content.
For example, for an article about sugarcane with Red Rot disease, a good seed would be 'sugarcane-red-rot'. For an article about a new fertilizer subsidy, 'fertilizer-policy' would be appropriate.
Do not use spaces or special characters in the seed. The URL format is https://picsum.photos/seed/{seed-keyword}/400/200.
Also provide a brief, accurate description of what the image should depict.

Ensure the output strictly follows the JSON schema.

State: {{{location}}}
`,
});

const fetchAgriNewsAndWeatherFlow = ai.defineFlow(
  {
    name: 'fetchAgriNewsAndWeatherFlow',
    inputSchema: AgriNewsAndWeatherInputSchema,
    outputSchema: AgriNewsAndWeatherOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
