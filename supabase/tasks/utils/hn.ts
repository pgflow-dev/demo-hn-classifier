/**
 * Utility functions for Hacker News API interactions
 */

/**
 * Extracts the item ID from a Hacker News URL
 * @param url - HN URL like "https://news.ycombinator.com/item?id=123456"
 * @returns The numeric item ID
 * @throws Error if URL is invalid or doesn't contain an item ID
 */
export function extractItemId(url: string): number {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "news.ycombinator.com") {
      throw new Error(`Invalid HN hostname: ${parsed.hostname}`);
    }

    if (parsed.pathname !== "/item") {
      throw new Error(`Invalid HN path: ${parsed.pathname}`);
    }

    const id = parsed.searchParams.get("id");
    if (!id) {
      throw new Error("Missing id parameter in URL");
    }

    const itemId = parseInt(id, 10);
    if (isNaN(itemId) || itemId <= 0) {
      throw new Error(`Invalid item ID: ${id}`);
    }

    return itemId;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to extract item ID from URL "${url}": ${error.message}`,
      );
    }
    throw new Error(
      `Failed to extract item ID from URL "${url}": Unknown error`,
    );
  }
}
