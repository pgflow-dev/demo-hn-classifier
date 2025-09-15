/**
 * Minimal Zod schemas for HN API validation
 */

import { z } from "zod";

// Just validate the shape we expect, let Zod throw if it's wrong
export const HnStorySchema = z.object({
  id: z.number(),
  title: z.string().optional().default(""),
  by: z.string().optional().default(""),
  time: z.number().optional().default(0),
  score: z.number().optional().default(0),
  kids: z.array(z.number()).optional(),
  dead: z.boolean().optional(),
  deleted: z.boolean().optional(),
}).passthrough();

export const HnCommentSchema = z.object({
  by: z.string().optional().default(""),
  text: z.string().optional().default(""),
  dead: z.boolean().optional(),
  deleted: z.boolean().optional(),
}).passthrough();

// Output types that satisfy Json constraint
export interface HnItem {
  id: number;
  title: string;
  by: string;
  time: number;
  score: number;
  kids?: number[];
  dead?: boolean;
  deleted?: boolean;
  [key: string]: any; // Allow extra fields
}

export interface HnComment {
  by: string;
  text: string;
  dead?: boolean;
  deleted?: boolean;
  [key: string]: any; // Allow extra fields
}


/**
 * Strip HTML tags from HN comment text
 */
export function cleanHtml(html: string): string {
  return html
    .replace(/<p>/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}