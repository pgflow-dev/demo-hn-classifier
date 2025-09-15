/**
 * Main Flow: Classify HN Item
 *
 * This flow demonstrates pgflow's parallel execution and dependency management:
 * - Steps 'item' and 'firstComment' run in parallel (no dependencies)
 * - Step 'classification' depends on both and consumes their outputs
 */

import { Flow } from "@pgflow/dsl/supabase";
import { fetchHnItem } from "../_tasks/fetchHnItem.ts";
import { fetchHnFirstComment } from "../_tasks/fetchHnFirstComment.ts";
import { classify } from "../_tasks/classify.ts";

// Flow input type
export type FlowInput = {
  url: string;
};

// Define the flow using correct DSL syntax
export default new Flow<FlowInput>({
  slug: "classifyHnItem",
})
  .step({ slug: "item" }, (input) => fetchHnItem(input.run.url))
  .step({ slug: "firstComment" }, (input) => fetchHnFirstComment(input.run.url))
  .step(
    { slug: "classification", dependsOn: ["item", "firstComment"] },
    (input) => classify(input.item.title, input.firstComment.text),
  );
