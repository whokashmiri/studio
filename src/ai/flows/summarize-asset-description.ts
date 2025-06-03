// src/ai/flows/summarize-asset-description.ts
'use server';

/**
 * @fileOverview Summarizes an asset description using GenAI.
 *
 * - summarizeAssetDescription - A function that handles the summarization process.
 * - SummarizeAssetDescriptionInput - The input type for the summarizeAssetDescription function.
 * - SummarizeAssetDescriptionOutput - The return type for the summarizeAssetDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAssetDescriptionInputSchema = z.object({
  assetDescription: z
    .string()
    .describe('The description of the asset that needs to be summarized.'),
});
export type SummarizeAssetDescriptionInput = z.infer<
  typeof SummarizeAssetDescriptionInputSchema
>;

const SummarizeAssetDescriptionOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the asset description.'),
});
export type SummarizeAssetDescriptionOutput = z.infer<
  typeof SummarizeAssetDescriptionOutputSchema
>;

export async function summarizeAssetDescription(
  input: SummarizeAssetDescriptionInput
): Promise<SummarizeAssetDescriptionOutput> {
  return summarizeAssetDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAssetDescriptionPrompt',
  input: {schema: SummarizeAssetDescriptionInputSchema},
  output: {schema: SummarizeAssetDescriptionOutputSchema},
  prompt: `You are an expert asset inspector. Your goal is to provide a consise summary of the asset description provided.  The summary should capture the key details of the asset.

Asset Description: {{{assetDescription}}}`,
});

const summarizeAssetDescriptionFlow = ai.defineFlow(
  {
    name: 'summarizeAssetDescriptionFlow',
    inputSchema: SummarizeAssetDescriptionInputSchema,
    outputSchema: SummarizeAssetDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
