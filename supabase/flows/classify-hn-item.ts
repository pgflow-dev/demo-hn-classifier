/**
 * Main Flow: Classify HN Item
 *
 * This flow demonstrates pgflow's parallel execution and dependency management:
 * - Steps 'item' and 'firstComment' run in parallel (no dependencies)
 * - Step 'classification' depends on both and consumes their outputs
 */

import { Flow } from "@pgflow/dsl/supabase";
import { fetchHnItem } from "../tasks/fetch-hn-item.ts";
import { fetchHnFirstComment } from "../tasks/fetch-hn-first-comment.ts";
import { classify } from "../tasks/classify.ts";

// Flow input type
export type FlowInput = {
  url: string;
};

// Define the flow using correct DSL syntax
export const ClassifyHnItem = new Flow<FlowInput>({
  slug: "classifyHnItem",
})
  .step({ slug: "item" }, (flowInput) => fetchHnItem(flowInput.url))
  .step({ slug: "firstComment" }, (flowInput) => fetchHnFirstComment(flowInput.url))
  .step(
    { slug: "classification", dependsOn: ["item", "firstComment"] },
    (deps) => classify(deps.item.title, deps.firstComment.text),
  );
