import { ClassifyHnItem } from "../../flows/classify-hn-item.ts";
import { EdgeWorker } from "@pgflow/edge-worker";

EdgeWorker.start(ClassifyHnItem, {
  pollIntervalMs: 100,
  maxPollSeconds: 5,
});
