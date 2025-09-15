/**
 * Fetch first comment for additional classification context
 */

import { extractItemId } from "../_utils/hn.ts";
import {
  HnStorySchema,
  HnCommentSchema,
  cleanHtml,
  type HnComment,
} from "../_utils/hnSchemas.ts";

export async function fetchHnFirstComment(url: string): Promise<HnComment> {
  const itemId = extractItemId(url);
  const emptyComment: HnComment = { by: "", text: "" };

  // Get the story
  const storyResponse = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`,
  );
  const storyData = await storyResponse.json();
  if (!storyData) return emptyComment;

  const story = HnStorySchema.parse(storyData);
  if (story.deleted || story.dead || !story.kids?.length) {
    return emptyComment;
  }

  // Get first comment
  const commentResponse = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${story.kids[0]}.json`,
  );
  const commentData = await commentResponse.json();
  if (!commentData) return emptyComment;

  const comment = HnCommentSchema.parse(commentData);
  if (comment.deleted || comment.dead) return emptyComment;

  // Return cleaned comment
  return {
    ...comment,
    text: comment.text ? cleanHtml(comment.text) : "",
  };
}
