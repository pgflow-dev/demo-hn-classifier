/**
 * Fetch HN story for classification
 */

import { extractItemId } from "../_utils/hn.ts";
import { HnStorySchema, type HnItem } from "../_utils/hnSchemas.ts";

export async function fetchHnItem(url: string): Promise<HnItem> {
  const itemId = extractItemId(url);

  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`,
  );

  const data = await response.json();
  if (!data) throw new Error(`Item ${itemId} not found`);

  const item = HnStorySchema.parse(data); // Will throw if invalid shape
  if (item.deleted || item.dead) throw new Error(`Item ${itemId} is deleted or dead`);

  return item;
}
