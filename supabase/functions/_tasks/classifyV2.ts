/**
 * Task: v2 Classification using Vercel AI SDK (enhanced rubric, reduced noise)
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { ClassificationSchema } from "../_utils/classificationSchema.ts";

/**
 * v2 Classification: Enhanced with more detailed rubric and stricter criteria
 * Designed to reduce noise and improve precision over v1
 *
 * @param title - HN story title
 * @param firstCommentText - Text content of the first comment (may be empty)
 * @param model - OpenAI model to use (default: gpt-5-mini)
 */
export async function classifyV2(
  title: string,
  firstCommentText: string,
  model: string = "gpt-5-mini"
) {
  const prompt = `Task: Classify this Hacker News story with high precision for AI-related content.

CLASSIFICATION CRITERIA:
- AI-related: Must contain explicit AI/ML technology discussion, not just tangential mentions
- Hype meter (1-10): Based on claim magnitude, evidence quality, and community reaction
- Tags: Maximum 3 most relevant technical tags

EVALUATION FRAMEWORK:
1. Content Analysis:
   - Direct AI/ML implementation or research
   - Technical depth vs. surface-level discussion
   - Concrete examples vs. vague assertions

2. Hype Assessment:
   - 1-3: Incremental improvements, well-documented
   - 4-6: Significant advances with solid evidence
   - 7-9: Major breakthroughs, broad implications
   - 10: Paradigm shifts, extraordinary claims

3. Signal Keywords (high confidence):
   Primary: LLM, neural network, transformer, fine-tuning, embeddings
   Secondary: AI safety, AGI, model training, inference optimization

4. First Comment Context:
   - Technical expert validation/criticism
   - Implementation details or limitations
   - Comparative analysis with existing solutions

STRICT RULES:
- Require multiple AI signals for isAiRelated=true
- Discount pure business/funding announcements
- Weight technical substance over marketing language
- Use first comment to verify or adjust classification

Title: "${title}"
First comment: "${firstCommentText}"`;

  const { object } = await generateObject({
    model: openai(model),
    prompt,
    schema: ClassificationSchema,
  });

  return object;
}
