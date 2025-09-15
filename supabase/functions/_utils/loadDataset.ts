/**
 * Database utility to load historical classification data for comparison
 */

import postgres from "postgres";
import classifyHnItemFlow from "../_flows/classifyHnItem.ts";
import type { StepInput, StepOutput } from "@pgflow/dsl";

export interface Datapoint {
  input: StepInput<typeof classifyHnItemFlow, "classification">;
  output: StepOutput<typeof classifyHnItemFlow, "classification">;
  run_id: string;
}

/**
 * Loads historical classification step inputs and outputs from the database
 * This dynamically pulls dependencies based on pgflow.deps table configuration
 */
export async function loadDataset(
  limit: number,
  sql: postgres.Sql,
  flowSlug: string = 'classifyHnItem',
  stepSlug: string = 'classification',
): Promise<Datapoint[]> {
  const results = await sql<
    Array<{
      run_id: string;
      input: any;
      output: any;
    }>
  >`
    WITH target_runs AS (
      -- Get runs with completed target step
      SELECT DISTINCT
        st.run_id,
        st.output as step_output,
        st.completed_at
      FROM pgflow.step_tasks st
      JOIN pgflow.runs r ON r.run_id = st.run_id
      WHERE st.step_slug = ${stepSlug}
        AND st.status = 'completed'
        AND r.flow_slug = ${flowSlug}
      ORDER BY st.completed_at DESC
      LIMIT ${limit}
    ),
    deps_data AS (
      -- Get all dependency outputs for the target step
      SELECT
        tr.run_id,
        dep.dep_slug,
        dep_task.output as dep_output
      FROM target_runs tr
      JOIN pgflow.deps dep ON
        dep.flow_slug = ${flowSlug}
        AND dep.step_slug = ${stepSlug}
      JOIN pgflow.step_tasks dep_task ON
        dep_task.run_id = tr.run_id
        AND dep_task.step_slug = dep.dep_slug
        AND dep_task.status = 'completed'
    ),
    aggregated_deps AS (
      -- Aggregate dependencies into a single JSON object per run
      SELECT
        dd.run_id,
        jsonb_object_agg(dd.dep_slug, dd.dep_output) as deps_output
      FROM deps_data dd
      GROUP BY dd.run_id
    ),
    runs_data AS (
      -- Get run input data
      SELECT
        r.run_id,
        r.input as run_input
      FROM pgflow.runs r
      WHERE r.run_id IN (SELECT run_id FROM target_runs)
    )
    SELECT
      tr.run_id,
      jsonb_build_object('run', rd.run_input) ||
        coalesce(ad.deps_output, '{}'::jsonb) as input,
      tr.step_output as output
    FROM target_runs tr
    JOIN runs_data rd ON rd.run_id = tr.run_id
    LEFT JOIN aggregated_deps ad ON ad.run_id = tr.run_id
    ORDER BY tr.run_id
  `;

  return results.map((row) => ({
    input: row.input,
    output: row.output,
    run_id: row.run_id,
  }));
}
