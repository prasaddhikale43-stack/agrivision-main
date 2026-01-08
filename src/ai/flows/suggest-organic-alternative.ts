
'use server';
/**
 * @fileOverview An AI agent that suggests an organic alternative to a given inorganic pesticide.
 *
 * - suggestOrganicAlternative - A function that handles the suggestion process.
 * - SuggestOrganicAlternativeInput - The input type for the function.
 * - SuggestOrganicAlternativeOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestOrganicAlternativeInputSchema = z.object({
  pesticideName: z.string().describe('The name of the inorganic pesticide the user has entered.'),
});
export type SuggestOrganicAlternativeInput = z.infer<typeof SuggestOrganicAlternativeInputSchema>;

const SuggestOrganicAlternativeOutputSchema = z.object({
  alternativeName: z.string().describe('The name of a suitable organic pesticide alternative.'),
  reasoning: z.string().describe('A brief explanation of why this is a good alternative, mentioning the pests it targets.'),
  applicationMethod: z.string().describe('A short suggestion on how to apply the organic alternative effectively.'),
});
export type SuggestOrganicAlternativeOutput = z.infer<typeof SuggestOrganicAlternativeOutputSchema>;

export async function suggestOrganicAlternative(input: SuggestOrganicAlternativeInput): Promise<SuggestOrganicAlternativeOutput> {
  return suggestOrganicAlternativeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOrganicAlternativePrompt',
  input: { schema: SuggestOrganicAlternativeInputSchema },
  output: { schema: SuggestOrganicAlternativeOutputSchema },
  prompt: `You are an agricultural expert specializing in organic and sustainable farming practices in India.
A farmer has entered an inorganic pesticide and is looking for a suitable organic alternative.
Based on the inorganic pesticide provided, suggest a widely available and effective organic alternative.

Inorganic Pesticide: {{{pesticideName}}}

Provide the following:
1.  **Alternative Name:** The common name of the organic pesticide (e.g., "Neem Oil", "Bacillus thuringiensis").
2.  **Reasoning:** Briefly explain why it's a good alternative. Mention common pests it controls that are likely targeted by the original pesticide.
3.  **Application Method:** Give a short, simple tip on how to apply it.

Your response must be concise and practical for a farmer.
`,
});

const suggestOrganicAlternativeFlow = ai.defineFlow(
  {
    name: 'suggestOrganicAlternativeFlow',
    inputSchema: SuggestOrganicAlternativeInputSchema,
    outputSchema: SuggestOrganicAlternativeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
