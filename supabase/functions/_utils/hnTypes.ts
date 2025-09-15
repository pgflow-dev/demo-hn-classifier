/**
 * Strict type definitions for Hacker News API responses and task outputs
 */

// ========================
// HN API Response Types
// ========================

/**
 * HN API Story type with all possible fields
 */
export interface HnApiStory {
  id: number;
  deleted?: boolean;
  type: "story";
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

/**
 * HN API Comment type with all possible fields
 */
export interface HnApiComment {
  id: number;
  deleted?: boolean;
  type: "comment";
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent: number;
  poll?: number;
  kids?: number[];
}

/**
 * Union type for any HN API item
 */
export type HnApiItem = HnApiStory | HnApiComment;

// ========================
// Task Output Types (Strict)
// ========================

/**
 * Strict output type for fetchHnItem task
 * All fields are required and have specific types
 */
export interface HnItemOutput {
  readonly id: number;
  readonly title: string;
  readonly by: string;
  readonly time: number;
  readonly score: number;
}

/**
 * Strict output type for fetchHnFirstComment task
 * All fields are required and have specific types
 */
export interface HnFirstCommentOutput {
  readonly by: string;
  readonly text: string;
}

// ========================
// Type Guards
// ========================

/**
 * Type guard to check if an API response is a story
 */
export function isHnStory(item: unknown): item is HnApiStory {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "story"
  );
}

/**
 * Type guard to check if an API response is a comment
 */
export function isHnComment(item: unknown): item is HnApiComment {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "comment"
  );
}

/**
 * Type guard to check if an API response is valid (not deleted or dead)
 */
export function isValidHnItem(item: unknown): boolean {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const hnItem = item as { deleted?: boolean; dead?: boolean };
  return !hnItem.deleted && !hnItem.dead;
}