'use server';

/**
 * @fileOverview Prepares the results of an AI scan to be stored in Firestore.
 *
 * - storeAIScanResults - A function that takes scan data and returns it in a structured format.
 * - StoreAIScanResultsInput - The input type for the storeAIScanResults function.
 * - StoreAIScanResultsOutput - The return type for the storeAIScanResults function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StoreAIScanResultsInputSchema = z.object({
  userId: z.string().describe('The ID of the user performing the scan.'),
  timestamp: z.string().describe('The timestamp of the scan.'),
  scanType: z.enum(['crop', 'soil']).describe('The type of scan performed.'),
  imageThumbnail: z
    .string()
    .describe(
      "A thumbnail of the image used for the scan, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   results: z.any().describe('A flexible object to store the results of the scan, which varies by scanType.'),
});

export type StoreAIScanResultsInput = z.infer<typeof StoreAIScanResultsInputSchema>;

// The output schema now explicitly nests the results, matching Firestore structure.
const StoreAIScanResultsOutputSchema = z.object({
    userId: z.string(),
    timestamp: z.string(),
    scanType: z.enum(['crop', 'soil']),
    imageThumbnail: z.string(),
    results: z.any(),
});
export type StoreAIScanResultsOutput = z.infer<typeof StoreAIScanResultsOutputSchema>;


export async function storeAIScanResults(input: StoreAIScanResultsInput): Promise<StoreAIScanResultsOutput> {
  return storeAIScanResultsFlow(input);
}

const storeAIScanResultsFlow = ai.defineFlow({
  name: 'storeAIScanResultsFlow',
  inputSchema: StoreAIScanResultsInputSchema,
  outputSchema: StoreAIScanResultsOutputSchema,
},
async input => {
  // This flow now simply validates and returns the input data,
  // ensuring the `results` object is correctly nested.
  return {
      userId: input.userId,
      timestamp: input.timestamp,
      scanType: input.scanType,
      imageThumbnail: input.imageThumbnail,
      results: input.results, // The results are already an object.
  };
});
