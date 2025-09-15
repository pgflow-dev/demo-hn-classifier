SELECT pgflow.create_flow('classifyHnItem');
SELECT pgflow.add_step('classifyHnItem', 'item');
SELECT pgflow.add_step('classifyHnItem', 'firstComment');
SELECT pgflow.add_step('classifyHnItem', 'classification', ARRAY['item', 'firstComment']);
