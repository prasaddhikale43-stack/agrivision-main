// The AI flow to analyze a crop image and provide actionable advice.

'use server';

/**
 * @fileOverview An AI agent that analyzes a crop image and provides actionable advice.
 *
 * - analyzeCropImageAndProvideAdvice - A function that handles the crop image analysis and advice generation process.
 * - AnalyzeCropImageAndProvideAdviceInput - The input type for the analyzeCropImageAndProvideAdvice function.
 * - AnalyzeCropImageAndProvideAdviceOutput - The return type for the analyzeCropImageAndProvideAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCropImageAndProvideAdviceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a crop, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeCropImageAndProvideAdviceInput = z.infer<typeof AnalyzeCropImageAndProvideAdviceInputSchema>;

const AnalyzeCropImageAndProvideAdviceOutputSchema = z.object({
  cropName: z.string().describe('The name of the crop.'),
  diagnosis: z.string().describe('The diagnosis of the crop, including any diseases or deficiencies.'),
  healthScore: z.number().min(0).max(100).describe('A numerical score from 0 (very unhealthy) to 100 (perfectly healthy) representing the health of the crop.'),
  advice: z.string().describe('Actionable advice on how to treat the crop and improve its health and yield.'),
  climatePrediction: z.string().describe('The predicted climate for the crop.'),
  climateAffect: z.string().describe('How the climate will affect the crop.'),
  pesticidesInIndia: z.string().describe('Pesticides used in India for the diagnosed diseases.'),
  pesticideUses: z.string().describe('The proper uses of the recommended pesticides.'),
  summary: z.string().describe('A summary of the analysis.'),
});
export type AnalyzeCropImageAndProvideAdviceOutput = z.infer<typeof AnalyzeCropImageAndProvideAdviceOutputSchema>;

export async function analyzeCropImageAndProvideAdvice(
  input: AnalyzeCropImageAndProvideAdviceInput
): Promise<AnalyzeCropImageAndProvideAdviceOutput> {
  return analyzeCropImageAndProvideAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCropImageAndProvideAdvicePrompt',
  input: {schema: AnalyzeCropImageAndProvideAdviceInputSchema},
  output: {schema: AnalyzeCropImageAndProvideAdviceOutputSchema},
  prompt: `You are an expert agronomist specializing in diagnosing crop illnesses and deficiencies, and providing actionable advice.

You will analyze the provided image of a crop and provide a diagnosis, including any diseases or deficiencies.
Based on the diagnosis, you will generate a health score between 0 and 100.
Then, you will provide actionable advice on how to treat the crop and improve its health and yield.
You will also provide a climate prediction and its effect on the crop, and recommend pesticides used in India with their proper uses. Finally, you will provide a summary of the analysis.

Crop Image: {{media url=photoDataUri}}

Respond in the following format:
{
  "cropName": "[Name of the crop]",
  "diagnosis": "[Diagnosis of the crop, including any diseases or deficiencies]",
  "healthScore": [A numerical score from 0 (very unhealthy) to 100 (perfectly healthy)],
  "advice": "[Actionable advice on how to treat the crop and improve its health and yield]",
  "climatePrediction": "[The predicted climate for the crop]",
  "climateAffect": "[How the climate will affect the crop]",
  "pesticidesInIndia": "[Pesticides used in India for the diagnosed diseases]",
  "pesticideUses": "[The proper uses of the recommended pesticides]",
  "summary": "[A summary of the analysis]"
}
`,
});

const analyzeCropImageAndProvideAdviceFlow = ai.defineFlow(
  {
    name: 'analyzeCropImageAndProvideAdviceFlow',
    inputSchema: AnalyzeCropImageAndProvideAdviceInputSchema,
    outputSchema: AnalyzeCropImageAndProvideAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
