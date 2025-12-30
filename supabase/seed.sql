-- Register the worker function with pgflow for automatic management
SELECT pgflow.track_worker_function('classify-hn-item-worker');
