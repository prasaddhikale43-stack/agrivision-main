'use server';
/**
 * @fileOverview An AI agent that analyzes a farming activity and provides carbon credit calculations and advice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CalculateCarbonCreditsInputSchema = z.object({
  userId: z.string().describe("The ID of the user logging the activity."),
  activityType: z.string().describe("The type of farming practice, e.g., 'Zero Tillage'."),
  area: z.number().optional().describe("Area in acres/hectares where the activity was performed."),
  pesticideUsed: z.string().optional().describe("Type of pesticide used, if any."),
  pesticideAmount: z.number().optional().describe("Amount of pesticide used."),
  notes: z.string().optional().describe("Additional notes from the user."),
  activityPhotoUrl: z.string().optional().describe("A photo of the activity, as a data URI."),
  cropPhotoUrl: z.string().optional().describe("A photo of the crop, as a data URI."),
  pesticidePhotoUrl: z.string().optional().describe("A photo of the pesticide/receipt, as a data URI."),
});

export type CalculateCarbonCreditsInput = z.infer<typeof CalculateCarbonCreditsInputSchema>;

const CalculateCarbonCreditsOutputSchema = z.object({
  estimatedCO2SavedKg: z.number().describe("The estimated carbon dioxide equivalent saved in kilograms."),
  rewardPoints: z.number().describe("Gamified points awarded for the activity."),
  reductionAdvice: z.string().describe("A short, actionable suggestion for the farmer to improve sustainability or their carbon footprint."),
  climateImpactAnalysis: z.string().describe("A slightly more detailed analysis of the positive climate impact of this activity."),
  isApproved: z.boolean().describe("Whether the activity is approved for credits. This should always be true."),
  verificationDetails: z.string().describe("A brief explanation of why the activity was approved."),
  pesticideAnalysis: z.string().describe("An analysis of the pesticide from its photo, including its type and general climate impact."),
  properUseAdvice: z.string().describe("Specific advice on how to use the identified pesticide in a climate-friendly way, including amounts and application methods."),
});
export type CalculateCarbonCreditsOutput = z.infer<typeof CalculateCarbonCreditsOutputSchema>;

export async function calculateCarbonCredits(input: CalculateCarbonCreditsInput): Promise<CalculateCarbonCreditsOutput> {
  return calculateCarbonCreditsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateCarbonCreditsPrompt',
  input: { schema: CalculateCarbonCreditsInputSchema },
  output: { schema: CalculateCarbonCreditsOutputSchema },
  prompt: `You are an expert agricultural analyst and carbon credit calculator specializing in sustainable farming.
Analyze the following farming activity and provide:
1.  A realistic estimate of carbon saved (in kg CO₂e). Use a base calculation where 'Zero Tillage' is ~1.5 kg/acre, 'Compost Application' is ~2.5 kg/ton, and other activities are around 1.0 kg/acre.
2.  A score of reward points (1 credit = 10 points).
3.  A short, actionable piece of general sustainability advice.
4.  A brief analysis of the positive climate impact.
5.  **Pesticide Analysis**: Analyze the pesticide from its photo. Identify it if possible and describe its general impact on the climate and soil.
6.  **Proper Use Advice**: Based on the pesticide photo, provide very specific advice on the proper amount and application technique to use to minimize climate impact and maximize effectiveness.
7.  A verification decision. You MUST set 'isApproved' to true.
8.  A brief justification for the verification, such as "Activity auto-verified based on photo evidence."

Activity Data:
- Practice Type: {{{activityType}}}
- Area: {{{area}}} acres
- Pesticide: {{{pesticideUsed}}}, {{{pesticideAmount}}} L
- Notes: {{{notes}}}
- Activity Photo: {{#if activityPhotoUrl}}{{media url=activityPhotoUrl}}{{else}}Not provided.{{/if}}
- Crop Photo: {{#if cropPhotoUrl}}{{media url=cropPhotoUrl}}{{else}}Not provided.{{/if}}
- Pesticide/Receipt Photo: {{#if pesticidePhotoUrl}}{{media url=pesticidePhotoUrl}}{{else}}Not provided.{{/if}}

The activity is always considered approved. You MUST set 'isApproved' to true in the final JSON output.
`,
});

const calculateCarbonCreditsFlow = ai.defineFlow(
  {
    name: 'calculateCarbonCreditsFlow',
    inputSchema: CalculateCarbonCreditsInputSchema,
    outputSchema: CalculateCarbonCreditsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
