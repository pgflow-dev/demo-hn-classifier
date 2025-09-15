/**
 * Task: v1 Classification using Vercel AI SDK (baseline, conservative approach)
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { ClassificationSchema } from "../_utils/classificationSchema.ts";

/**
 * v1 Classification: Conservative baseline approach
 * Uses the original prompt for AI-related content classification
 *
 * @param title - HN story title
 * @param firstCommentText - Text content of the first comment (may be empty)
 */
export async function classify(title: string, firstCommentText: string) {
  const prompt = `Task: Extract structured information about this Hacker News story.
Return ONLY json matching provided schema.
Use firstCommentContent (if provided) to enrich the output and guide extraction.

Signals for AI: AI, LLM, model, agents, ML/DL, RAG, embeddings, vector DB, inference,
fine-tune, tokenizer, safety/policy, model release, compute, AGI, OpenAI, GPT, Anthropic, Claude etc.

Prefer precision over recall. If unsure → ai_related=false, hype_meter<=3.

Title: "${title}"
First comment (may be empty): "${firstCommentText}"`;

  const { object } = await generateObject({
    model: openai("gpt-5-mini"),
    prompt,
    schema: ClassificationSchema,
  });

  return object;
}
