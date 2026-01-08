'use server';

/**
 * @fileOverview An AI agent that predicts climate-based disease risks for a given location.
 *
 * - getClimateDiseaseRisk - A function that returns a risk assessment.
 * - ClimateDiseaseRiskInput - The input type for the function.
 * - ClimateDiseaseRiskOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ClimateDiseaseRiskInputSchema = z.object({
  location: z.string().describe('The agricultural region or state in India to analyze.'),
});
export type ClimateDiseaseRiskInput = z.infer<typeof ClimateDiseaseRiskInputSchema>;

const DiseaseRiskSchema = z.object({
  diseaseName: z.string().describe('The common name of the potential crop disease.'),
  riskLevel: z.enum(['Low', 'Medium', 'High']).describe('The predicted risk level for this disease.'),
  primaryCropsAffected: z.array(z.string()).describe('The main crops that are susceptible.'),
  preventiveMeasures: z.string().describe('A brief recommendation for preventive action.'),
});

const HeatmapZoneSchema = z.object({
  zone: z.string().describe('The name of the geographical sub-zone, e.g., "Northern Quadrant".'),
  riskFactor: z.number().min(0).max(1).describe('A numerical risk factor from 0 (low) to 1 (high).'),
});

const ClimateDiseaseRiskOutputSchema = z.object({
  overallRiskSummary: z.string().describe('A one-paragraph summary of the overall disease risk based on the 2-week climate forecast.'),
  heatmapZones: z.array(HeatmapZoneSchema).length(4).describe('An array of 4 zones for the heatmap visualization.'),
  highRiskDiseases: z.array(DiseaseRiskSchema).describe('A list of specific diseases with a high likelihood of occurring.'),
});
export type ClimateDiseaseRiskOutput = z.infer<typeof ClimateDiseaseRiskOutputSchema>;


export async function getClimateDiseaseRisk(
  input: ClimateDiseaseRiskInput
): Promise<ClimateDiseaseRiskOutput> {
  return getClimateDiseaseRiskFlow(input);
}


const prompt = ai.definePrompt({
  name: 'getClimateDiseaseRiskPrompt',
  input: { schema: ClimateDiseaseRiskInputSchema },
  output: { schema: ClimateDiseaseRiskOutputSchema },
  prompt: `You are an agro-meteorological AI expert for India.
Given a location, generate a fictional but plausible 2-week climate forecast and predict the corresponding crop disease risks.

Location: {{{location}}}

1.  **Generate a brief, overall risk summary.**
2.  **Create a heatmap representation:**
    *   Divide the location into four fictional geographical zones (e.g., North, East, South, West).
    *   Assign a numerical \`riskFactor\` from 0.0 to 1.0 to each zone based on your simulated forecast (e.g., higher humidity and intermittent rain might lead to a higher risk factor for fungal diseases).
3.  **Identify 2-3 high-risk diseases:**
    *   For the given location, identify specific crop diseases that would be plausible under your simulated forecast.
    *   For each disease, specify the risk level, the crops it affects, and a concise preventive measure.

Ensure the output strictly follows the JSON schema.
`,
});

const getClimateDiseaseRiskFlow = ai.defineFlow(
  {
    name: 'getClimateDiseaseRiskFlow',
    inputSchema: ClimateDiseaseRiskInputSchema,
    outputSchema: ClimateDiseaseRiskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
