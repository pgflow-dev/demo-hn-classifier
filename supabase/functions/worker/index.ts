import classifyHnItemFlow from "../_flows/classifyHnItem.ts";
import { EdgeWorker } from "@pgflow/edge-worker";

EdgeWorker.start(classifyHnItemFlow, {
  pollIntervalMs: 100,
  maxPollSeconds: 5,
});
