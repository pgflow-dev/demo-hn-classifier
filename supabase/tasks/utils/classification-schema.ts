/**
 * Shared classification schema for both v1 and v2 tasks
 */

import { z } from "zod";

export const ClassificationSchema = z.object({
  isAiRelated: z.boolean().describe("Whether the content is AI/ML related"),
  hypeMeter: z.number().int().min(1).max(10).describe("Hype level from 1-10"),
  tags: z.array(z.string()).max(3).describe("Maximum 3 relevant tags"),
});

export type ClassificationOutput = z.infer<typeof ClassificationSchema>;