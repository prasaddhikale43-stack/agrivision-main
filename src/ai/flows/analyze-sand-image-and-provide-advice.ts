'use server';

/**
 * @fileOverview An AI agent that analyzes a sand/soil image and provides recommendations.
 *
 * - analyzeSandImageAndProvideAdvice - A function that handles the soil analysis process.
 * - AnalyzeSandImageAndProvideAdviceInput - The input type for the analyzeSandImageAndProvideAdvice function.
 * - AnalyzeSandImageAndProvideAdviceOutput - The return type for the analyzeSandImageAndProvideAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSandImageAndProvideAdviceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of sand/soil, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeSandImageAndProvideAdviceInput = z.infer<typeof AnalyzeSandImageAndProvideAdviceInputSchema>;

const AnalyzeSandImageAndProvideAdviceOutputSchema = z.object({
  capacityToGrow: z.string().describe('The capacity of the soil to grow a particular crop.'),
  pesticidesForGrowth: z.string().describe('Pesticides recommended for proper crop growth in this soil.'),
  waterNeeded: z.string().describe('The amount of water needed for crops in this soil.'),
  waterPercentage: z.number().min(0).max(100).describe('The current water percentage in the soil, from 0-100.'),
  nutrientLevel: z.number().min(0).max(100).describe('An overall nutrient level score for the soil, from 0-100.'),
});
export type AnalyzeSandImageAndProvideAdviceOutput = z.infer<typeof AnalyzeSandImageAndProvideAdviceOutputSchema>;

export async function analyzeSandImageAndProvideAdvice(
  input: AnalyzeSandImageAndProvideAdviceInput
): Promise<AnalyzeSandImageAndProvideAdviceOutput> {
  return analyzeSandImageAndProvideAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSandImageAndProvideAdvicePrompt',
  input: {schema: AnalyzeSandImageAndProvideAdviceInputSchema},
  output: {schema: AnalyzeSandImageAndProvideAdviceOutputSchema},
  prompt: `You are an expert soil scientist. You will analyze the provided image of soil and provide recommendations.

You will determine the soil's capacity to grow a particular crop, recommend pesticides for proper growth, estimate the water needed, the current water percentage (as a number from 0-100), and an overall nutrient level score (from 0-100).

Soil Image: {{media url=photoDataUri}}

Respond in the following format:
{
  "capacityToGrow": "[The capacity of the soil to grow a particular crop]",
  "pesticidesForGrowth": "[Pesticides recommended for proper crop growth in this soil]",
  "waterNeeded": "[The amount of water needed for crops in this soil]",
  "waterPercentage": [The current water percentage in the soil as a number from 0-100],
  "nutrientLevel": [An overall nutrient level score from 0-100]
}
`,
});

const analyzeSandImageAndProvideAdviceFlow = ai.defineFlow(
  {
    name: 'analyzeSandImageAndProvideAdviceFlow',
    inputSchema: AnalyzeSandImageAndProvideAdviceInputSchema,
    outputSchema: AnalyzeSandImageAndProvideAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
