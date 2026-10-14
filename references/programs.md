# Mapping programs to machines

Choose objects by behavior, then choose artwork. A factory metaphor should expose
the program’s important invariants rather than reproduce Factorio’s own recipes.

| Program concept | Object | Behavior to show |
|---|---|---|
| Value / message | Item with a value label | Stable identity, owner, and route |
| Sequence / stream | Belt | Ordering and transfers |
| Function / worker | Assembler | Busy versus idle, input and output |
| Predicate / branch | Sorter station or splitter | Both outcomes and condition |
| Queue / buffer | Chest | Contents, order, capacity if bounded |
| Cache | Chest plus lookup station | Hit skips work; miss fills it |
| Accumulator | Storage with a numeric readout | Each update and initial value |
| Dependency | Wire / control connection | A signal actually enables work |
| Rejection | Separate receiver | Removed value and reason remain inspectable |
| Parallel execution | Multiple workers | Real or explicitly modeled scheduling |

The array example is intentionally eager, matching JavaScript array calls:
filter scans the complete input into a buffer, map processes the filtered buffer,
and reduce consumes the mapped buffer. Do not reuse that choreography for a lazy
iterator or a concurrent queue. Conversely, do not claim a fused factory line
illustrates the side-effect ordering of eager array operations.

For a new program, record: input, expected output, execution granularity, visible
state, event meanings, and what is abstracted. Use a pure model or a recorded
trace. If only pseudocode is available, label the result as a model. Do not infer
CPU throughput, timing, memory layout, or concurrency from the machine artwork.

For stateful systems, add checks for conservation and ownership: no token belongs
to two queues, capacity is never exceeded, a blocked transfer retains its value,
and restart/cancellation follow the real program. For numeric examples, include
empty inputs, rejected inputs, and zeros; use the language’s actual numeric rules.
