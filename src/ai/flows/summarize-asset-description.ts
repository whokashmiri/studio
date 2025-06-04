
// src/ai/flows/summarize-asset-description.ts
'use server';

/**
 * @fileOverview Summarizes asset descriptions (voice and text) using GenAI.
 *
 * - summarizeAssetDescription - A function that handles the summarization process.
 * - SummarizeAssetDescriptionInput - The input type for the summarizeAssetDescription function.
 * - SummarizeAssetDescriptionOutput - The return type for the summarizeAssetDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAssetDescriptionInputSchema = z.object({
  voiceDescription: z
    .string()
    .describe('The voice-captured description of the asset.')
    .optional(),
  textDescription: z
    .string()
    .describe('The typed/written description of the asset.')
    .optional(),
});
export type SummarizeAssetDescriptionInput = z.infer<
  typeof SummarizeAssetDescriptionInputSchema
>;

const SummarizeAssetDescriptionOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the combined asset descriptions.'),
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
  prompt: `You are an expert asset inspector. Your goal is to provide a concise summary based on the provided voice and text descriptions of an asset. The summary should capture the key details from both sources. If one description is empty or not provided, base the summary on the available one. If both are empty, indicate that no description was provided.

{{#if voiceDescription}}
Voice Description:
{{{voiceDescription}}}
{{/if}}

{{#if textDescription}}
Written Description:
{{{textDescription}}}
{{/if}}

{{#unless voiceDescription}}{{#unless textDescription}}
No detailed description was provided for this asset.
{{/unless}}{{/unless}}
`,
});

const summarizeAssetDescriptionFlow = ai.defineFlow(
  {
    name: 'summarizeAssetDescriptionFlow',
    inputSchema: SummarizeAssetDescriptionInputSchema,
    outputSchema: SummarizeAssetDescriptionOutputSchema,
  },
  async input => {
    if (!input.voiceDescription && !input.textDescription) {
      return { summary: 'No description provided to summarize.' };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
