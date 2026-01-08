'use server';
/**
 * @fileOverview A conversational AI chatbot for the AgriVision platform.
 *
 * - agriChatbot - A function that handles the chatbot conversation.
 * - AgriChatbotInput - The input type for the agriChatbot function.
 * - AgriChatbotOutput - The return type for the agriChatbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ContentPartSchema = z.union([
  z.object({ text: z.string() }),
  z.object({ media: z.object({ url: z.string(), contentType: z.string().optional() }) }),
]);

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(ContentPartSchema),
});


const AgriChatbotInputSchema = z.object({
  history: z.array(MessageSchema).describe('The conversation history.'),
  message: z.array(ContentPartSchema).describe("The user's message, which can include text, images, audio, or video."),
});

export type AgriChatbotInput = z.infer<typeof AgriChatbotInputSchema>;

export type AgriChatbotOutput = string;

export async function agriChatbot(input: AgriChatbotInput): Promise<AgriChatbotOutput> {
  const response = await agriChatbotFlow(input);
  return response;
}

const agriChatbotFlow = ai.defineFlow(
  {
    name: 'agriChatbotFlow',
    inputSchema: AgriChatbotInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are AgriBot, a friendly and knowledgeable AI assistant for the AgriVision platform.
Your purpose is to help farmers, agronomists, and agricultural enthusiasts.
You can answer questions about crop management, disease diagnosis from images, soil health from photos, sustainable farming practices, and how to use the AgriVision platform.
When analyzing images, be descriptive and clear.
Be concise, helpful, and always maintain a positive and encouraging tone.
If you don't know an answer, say so honestly and suggest where the user might find the information.
The current date is ${new Date().toLocaleDateString()}.`,
      history: input.history,
      prompt: input.message,
    });

    return response.text;
  }
);
