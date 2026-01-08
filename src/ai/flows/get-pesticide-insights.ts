'use server';
/**
 * @fileOverview An AI agent that generates pesticide usage insights for a list of crops.
 * 
 * - getPesticideInsights - Generates simulated pesticide usage data and advice.
 * - GetPesticideInsightsInput - Input schema for the flow.
 * - GetPesticideInsightsOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetPesticideInsightsInputSchema = z.object({
  cropNames: z.array(z.string()).describe("A list of crop names to generate insights for."),
});
export type GetPesticideInsightsInput = z.infer<typeof GetPesticideInsightsInputSchema>;

const PesticideInsightSchema = z.object({
    cropName: z.string().describe("The name of the crop."),
    organic: z.number().describe("The number of organic pesticide applications this month."),
    chemical: z.number().describe("The number of chemical pesticide applications this month."),
});
export type PesticideInsight = z.infer<typeof PesticideInsightSchema>;

const GetPesticideInsightsOutputSchema = z.object({
  insights: z.array(PesticideInsightSchema),
  overallAdvice: z.string().describe("A short, actionable paragraph of overall advice for the farmer based on the generated pesticide usage data."),
});
export type GetPesticideInsightsOutput = z.infer<typeof GetPesticideInsightsOutputSchema>;

export async function getPesticideInsights(input: GetPesticideInsightsInput): Promise<GetPesticideInsightsOutput> {
    return getPesticideInsightsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'getPesticideInsightsPrompt',
    input: { schema: GetPesticideInsightsInputSchema },
    output: { schema: GetPesticideInsightsOutputSchema },
    prompt: `You are an agricultural AI expert specializing in pesticide usage patterns.
For the given list of crops, generate a realistic but fictional breakdown of pesticide applications for the current month.
Distinguish between 'organic' and 'chemical' applications. The numbers should be plausible for a small to medium-sized farm.
Then, based on the data you've generated, provide a short, actionable paragraph of overall advice. For example, if chemical usage is high, suggest exploring integrated pest management (IPM) or specific organic alternatives.

Crops: {{{json cropNames}}}
`,
});


const getPesticideInsightsFlow = ai.defineFlow(
    {
        name: 'getPesticideInsightsFlow',
        inputSchema: GetPesticideInsightsInputSchema,
        outputSchema: GetPesticideInsightsOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
