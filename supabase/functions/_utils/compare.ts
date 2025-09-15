#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Compare Script: Test classification with different models
 *
 * This script demonstrates pgflow's ability to replay improved task versions
 * on historical inputs without modifying the database.
 *
 * Usage:
 *   deno run --allow-env --allow-net compare.ts [--limit N]
 */

import postgres from "postgres";
import { classifyV2 } from "../_tasks/classifyV2.ts";
import { loadDataset } from "./loadDataset.ts";
import classifyHnItemFlow from "../_flows/classifyHnItem.ts";
import type { StepInput, StepOutput } from "@pgflow/dsl";

// Use pgflow utility types for type inference
type ClassificationInput = StepInput<
  typeof classifyHnItemFlow,
  "classification"
>;
type ClassificationOutput = StepOutput<
  typeof classifyHnItemFlow,
  "classification"
>;

// Parse command line arguments
function parseArgs(): { limit: number } {
  const args = Deno.args;
  const limitIndex = args.indexOf("--limit");

  if (limitIndex !== -1 && limitIndex + 1 < args.length) {
    const limitValue = parseInt(args[limitIndex + 1], 10);
    if (isNaN(limitValue) || limitValue <= 0) {
      console.error("Invalid limit value. Must be a positive integer.");
      Deno.exit(1);
    }
    return { limit: limitValue };
  }

  return { limit: 10 }; // Default to last 10 runs
}

/**
 * Run classification with a specific model
 */
async function runModel(
  input: ClassificationInput,
  model: string,
): Promise<ClassificationOutput> {
  return await classifyV2(
    input.item.title || "",
    input.firstComment.text || "",
    model,
  );
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Pad string to exact length, accounting for ANSI escape codes
 */
function padWithAnsi(str: string, length: number): string {
  // Remove ANSI escape codes to calculate actual visible length
  const visibleStr = str.replace(/\x1b\[[0-9;]*m/g, '');
  const visibleLength = visibleStr.length;
  const padAmount = length - visibleLength;

  if (padAmount <= 0) {
    return str;
  }

  return str + ' '.repeat(padAmount);
}

/**
 * Format boolean value with color
 */
function formatBool(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return `${colors.red}missing${colors.reset}`; // Error/missing
  }
  return value ? `${colors.green}true${colors.reset}` : `${colors.dim}false${colors.reset}`;
}

/**
 * Format hype meter with color
 */
function formatHype(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return `${colors.red}✗${colors.reset}`;
  }
  const color = value >= 7 ? colors.red : value >= 4 ? colors.yellow : colors.green;
  return `${color}${value}${colors.reset}`;
}

/**
 * Format tags array compactly
 */
function formatTags(tags: string[]): string {
  if (tags.length === 0) return "[]";
  if (tags.length <= 2) return `[${tags.join(", ")}]`;
  return `[${tags[0]}, +${tags.length - 1}]`;
}

/**
 * Summary data for each run comparison
 */
interface RunSummary {
  runId: string;
  title: string;
  url: string;
  stored: ClassificationOutput;
  nano: ClassificationOutput;
  mini: ClassificationOutput;
  gpt5: ClassificationOutput;
  hasChanges: boolean;
}

async function main() {
  const { limit } = parseArgs();

  // Setup database connection
  const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  // Verify OpenAI API key
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is required");
    Deno.exit(1);
  }

  const sql = postgres(DB_URL, {
    max: 4,
    prepare: false,
  });

  try {
    console.log(
      `${colors.bright}🔍 Loading ${limit === 1 ? 'the most recent' : `${limit} recent`} classification run${limit === 1 ? '' : 's'} for comparison...${colors.reset}\n`,
    );

    // Load historical data
    const dataset = await loadDataset(limit, sql);

    if (dataset.length === 0) {
      console.log(
        "No completed classification runs found. Run some flows first!",
      );
      return;
    }

    console.log(`${colors.green}✓${colors.reset} Found ${dataset.length} run${dataset.length === 1 ? '' : 's'} to compare.\n`);

    console.log(`${colors.yellow}⚠ Note:${colors.reset} Testing enhanced v2 prompt (different from original) across multiple GPT-5 models.\n`);

    // Filter out datapoints with missing output
    const validDatapoints = dataset.filter(datapoint => {
      if (!datapoint.output) {
        console.log(`${colors.yellow}⚠ Skipping run ${datapoint.run_id} - no stored output${colors.reset}`);
        return false;
      }
      if (datapoint.output.isAiRelated === undefined) {
        console.log(`${colors.yellow}⚠ Warning: Run ${datapoint.run_id} has missing isAiRelated field in stored data${colors.reset}`);
      }
      return true;
    });

    console.log(`${colors.dim}Running classifications with GPT-5 models for ${validDatapoints.length} items in parallel...${colors.reset}\n`);

    // Prepare all classification tasks
    const classificationTasks = validDatapoints.flatMap(datapoint => [
      { datapoint, model: "gpt-5-nano", promise: runModel(datapoint.input, "gpt-5-nano") },
      { datapoint, model: "gpt-5-mini", promise: runModel(datapoint.input, "gpt-5-mini") },
      { datapoint, model: "gpt-5", promise: runModel(datapoint.input, "gpt-5") },
    ]);

    // Run ALL classifications in parallel
    const allResults = await Promise.allSettled(classificationTasks.map(task => task.promise));

    // Group results by datapoint
    const resultsByDatapoint = new Map<string, { nano: any; mini: any; gpt5: any }>();
    for (let i = 0; i < allResults.length; i += 3) {
      const datapoint = validDatapoints[Math.floor(i / 3)];
      resultsByDatapoint.set(datapoint.run_id, {
        nano: allResults[i].status === 'fulfilled'
          ? allResults[i].value
          : { isAiRelated: null, hypeMeter: 0, tags: [], error: allResults[i].reason },
        mini: allResults[i + 1].status === 'fulfilled'
          ? allResults[i + 1].value
          : { isAiRelated: null, hypeMeter: 0, tags: [], error: allResults[i + 1].reason },
        gpt5: allResults[i + 2].status === 'fulfilled'
          ? allResults[i + 2].value
          : { isAiRelated: null, hypeMeter: 0, tags: [], error: allResults[i + 2].reason },
      });
    }

    // Store summaries for the table
    const summaries: RunSummary[] = [];

    // Process and display results
    for (let i = 0; i < validDatapoints.length; i++) {
      const datapoint = validDatapoints[i];
      const results = resultsByDatapoint.get(datapoint.run_id)!;

      if (validDatapoints.length > 1) {
        console.log(`${colors.bright}${colors.blue}━━━ Run ${i + 1} of ${validDatapoints.length} ━━━${colors.reset}`);
      }
      console.log(`${colors.dim}Run ID: ${datapoint.run_id}${colors.reset}`);

      // Display the URL (clickable in most terminals)
      const itemUrl = datapoint.input.run?.url || datapoint.input.item?.url || "";
      if (itemUrl) {
        console.log(`${colors.bright}URL:${colors.reset} ${colors.cyan}${itemUrl}${colors.reset}`);
      }

      console.log(`${colors.bright}Title:${colors.reset} "${datapoint.input.item.title || ""}"`);

      // Show first comment preview
      const commentText = datapoint.input.firstComment?.text || "";
      const commentPreview = commentText.length > 100 ?
        commentText.substring(0, 100) + "..." :
        commentText;
      if (commentPreview) {
        console.log(`${colors.dim}Comment preview: ${commentPreview}${colors.reset}`);
      }
      console.log();

      // Display results in attribute-focused format
      console.log(`${colors.bright}📊 Classification Results:${colors.reset}`);
      console.log(`${colors.gray}${"-".repeat(70)}${colors.reset}`);

      // isAiRelated comparison
      console.log(`${colors.bright}isAiRelated:${colors.reset}`);
      console.log(`  original: ${formatBool(datapoint.output?.isAiRelated)}`);
      console.log(`  nano:     ${formatBool(results.nano.isAiRelated)}`);
      console.log(`  mini:     ${formatBool(results.mini.isAiRelated)}`);
      console.log(`  gpt5:     ${formatBool(results.gpt5.isAiRelated)}`);
      console.log();

      // hypeMeter comparison
      console.log(`${colors.bright}hypeMeter:${colors.reset}`);
      console.log(`  original: ${formatHype(datapoint.output.hypeMeter)}`);
      console.log(`  nano:     ${formatHype(results.nano.hypeMeter)}`);
      console.log(`  mini:     ${formatHype(results.mini.hypeMeter)}`);
      console.log(`  gpt5:     ${formatHype(results.gpt5.hypeMeter)}`);
      console.log();

      // tags comparison
      console.log(`${colors.bright}tags:${colors.reset}`);
      console.log(`  original: ${colors.dim}${JSON.stringify(datapoint.output.tags)}${colors.reset}`);
      console.log(`  nano:   ${colors.cyan}${JSON.stringify(results.nano.tags)}${colors.reset}`);
      console.log(`  mini:   ${colors.cyan}${JSON.stringify(results.mini.tags)}${colors.reset}`);
      console.log(`  gpt5:   ${colors.cyan}${JSON.stringify(results.gpt5.tags)}${colors.reset}`);

      // Check for changes
      const hasChanges =
        datapoint.output.isAiRelated !== results.gpt5.isAiRelated ||
        datapoint.output.hypeMeter !== results.gpt5.hypeMeter ||
        JSON.stringify(datapoint.output.tags) !== JSON.stringify(results.gpt5.tags);

      // Store summary
      summaries.push({
        runId: datapoint.run_id,
        title: (datapoint.input.item.title || "").substring(0, 50) +
               (datapoint.input.item.title?.length > 50 ? "..." : ""),
        url: itemUrl,
        stored: datapoint.output,
        nano: results.nano,
        mini: results.mini,
        gpt5: results.gpt5,
        hasChanges,
      });

      if (validDatapoints.length > 1) {
        console.log("\n" + colors.gray + "═".repeat(70) + colors.reset + "\n");
      }
    }

    // Display summary tables if multiple runs
    if (dataset.length > 1) {
      // Define column widths
      const TITLE_WIDTH = 40;
      const VALUE_WIDTH = 10;

      // AI Related Table
      console.log(`\n${colors.bright}📊 AI Related Classification${colors.reset}`);
      console.log(`${colors.gray}${"-".repeat(80)}${colors.reset}`);
      console.log(
        `${colors.bright}${"Title".padEnd(TITLE_WIDTH)} ${"Original".padEnd(VALUE_WIDTH)} ${"Nano".padEnd(VALUE_WIDTH)} ${"Mini".padEnd(VALUE_WIDTH)} ${"GPT5".padEnd(VALUE_WIDTH)}${colors.reset}`
      );
      console.log(`${colors.gray}${"-".repeat(80)}${colors.reset}`);

      summaries.forEach((summary) => {
        const title = summary.title.substring(0, 38).padEnd(TITLE_WIDTH);
        const stored = padWithAnsi(formatBool(summary.stored.isAiRelated), VALUE_WIDTH);
        const nano = padWithAnsi(formatBool(summary.nano.isAiRelated), VALUE_WIDTH);
        const mini = padWithAnsi(formatBool(summary.mini.isAiRelated), VALUE_WIDTH);
        const gpt5 = padWithAnsi(formatBool(summary.gpt5.isAiRelated), VALUE_WIDTH);

        console.log(`${title} ${stored} ${nano} ${mini} ${gpt5}`);
      });

      // Hype Meter Table
      console.log(`\n${colors.bright}📊 Hype Meter Scores${colors.reset}`);
      console.log(`${colors.gray}${"-".repeat(80)}${colors.reset}`);
      console.log(
        `${colors.bright}${"Title".padEnd(TITLE_WIDTH)} ${"Original".padEnd(VALUE_WIDTH)} ${"Nano".padEnd(VALUE_WIDTH)} ${"Mini".padEnd(VALUE_WIDTH)} ${"GPT5".padEnd(VALUE_WIDTH)}${colors.reset}`
      );
      console.log(`${colors.gray}${"-".repeat(80)}${colors.reset}`);

      summaries.forEach((summary) => {
        const title = summary.title.substring(0, 38).padEnd(TITLE_WIDTH);
        const stored = padWithAnsi(formatHype(summary.stored.hypeMeter), VALUE_WIDTH);
        const nano = padWithAnsi(formatHype(summary.nano.hypeMeter), VALUE_WIDTH);
        const mini = padWithAnsi(formatHype(summary.mini.hypeMeter), VALUE_WIDTH);
        const gpt5 = padWithAnsi(formatHype(summary.gpt5.hypeMeter), VALUE_WIDTH);

        console.log(`${title} ${stored} ${nano} ${mini} ${gpt5}`);
      });

      // Tags Table
      console.log(`\n${colors.bright}📊 Tags Comparison${colors.reset}`);
      console.log(`${colors.gray}${"-".repeat(100)}${colors.reset}`);
      console.log(
        `${colors.bright}${"Title".padEnd(40)} ${"Model".padEnd(10)} ${"Tags".padEnd(50)}${colors.reset}`
      );
      console.log(`${colors.gray}${"-".repeat(100)}${colors.reset}`);

      summaries.forEach((summary) => {
        const title = summary.title.substring(0, 38).padEnd(40);

        // Show stored tags
        console.log(`${title} ${"Original".padEnd(10)} ${formatTags(summary.stored.tags).padEnd(50)}`);

        // Only show other models if tags differ from stored
        if (JSON.stringify(summary.nano.tags) !== JSON.stringify(summary.stored.tags)) {
          console.log(`${"".padEnd(40)} ${colors.cyan}${"Nano".padEnd(10)} ${formatTags(summary.nano.tags).padEnd(50)}${colors.reset}`);
        }
        if (JSON.stringify(summary.mini.tags) !== JSON.stringify(summary.stored.tags)) {
          console.log(`${"".padEnd(40)} ${colors.cyan}${"Mini".padEnd(10)} ${formatTags(summary.mini.tags).padEnd(50)}${colors.reset}`);
        }
        if (JSON.stringify(summary.gpt5.tags) !== JSON.stringify(summary.stored.tags)) {
          console.log(`${"".padEnd(40)} ${colors.cyan}${"GPT5".padEnd(10)} ${formatTags(summary.gpt5.tags).padEnd(50)}${colors.reset}`);
        }

        console.log(`${colors.gray}${"-".repeat(100)}${colors.reset}`);
      });

      // Statistics
      const changedCount = summaries.filter(s => s.hasChanges).length;
      const aiDisagreements = summaries.filter(s => {
        const vals = [s.stored.isAiRelated, s.nano.isAiRelated, s.mini.isAiRelated, s.gpt5.isAiRelated];
        return new Set(vals).size > 1;
      }).length;

      console.log(`\n${colors.bright}📈 Statistics:${colors.reset}`);
      console.log(`  • Runs with changes: ${changedCount}/${summaries.length}`);
      console.log(`  • AI classification disagreements: ${aiDisagreements}`);

      // Average hype differences
      const avgHypeDiff = {
        nano: summaries.reduce((acc, s) => acc + (s.nano.hypeMeter - s.stored.hypeMeter), 0) / summaries.length,
        mini: summaries.reduce((acc, s) => acc + (s.mini.hypeMeter - s.stored.hypeMeter), 0) / summaries.length,
        gpt5: summaries.reduce((acc, s) => acc + (s.gpt5.hypeMeter - s.stored.hypeMeter), 0) / summaries.length,
      };
      console.log(`  • Average hype change from stored:`);
      console.log(`    - nano:  ${avgHypeDiff.nano > 0 ? '+' : ''}${avgHypeDiff.nano.toFixed(1)}`);
      console.log(`    - mini:  ${avgHypeDiff.mini > 0 ? '+' : ''}${avgHypeDiff.mini.toFixed(1)}`);
      console.log(`    - gpt5:  ${avgHypeDiff.gpt5 > 0 ? '+' : ''}${avgHypeDiff.gpt5.toFixed(1)}`);

      // Show URLs for easy access
      console.log(`\n${colors.bright}🔗 URLs:${colors.reset}`);
      summaries.forEach((s, i) => {
        console.log(`  ${i + 1}. ${colors.cyan}${s.url}${colors.reset}`);
      });
    }

    console.log(`\n${colors.green}${colors.bright}✅ Comparison complete!${colors.reset} Processed ${dataset.length} run${dataset.length === 1 ? '' : 's'}.`);

    if (limit === 1) {
      console.log(`\n${colors.dim}💡 Tip: Use --limit N to compare multiple runs${colors.reset}`);
    } else {
      console.log(
        `\n${colors.dim}📝 Note: Comparing v2 prompt across GPT-5 models to test classification consistency.${colors.reset}`,
      );
    }
  } catch (error) {
    console.error("Comparison failed:", error);
    Deno.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
if (import.meta.main) {
  await main();
}