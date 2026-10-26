# Board changes

- Keep component, net, placement, schematic and pour declarations in TSX.
- Generate signal copper with autorouting phases. Do not import saved routes,
  manually specify signal paths, or post-process Circuit JSON.
- Preserve DDR constraints and full-stack vias with 0.30 mm drills and
  at least 0.50 mm copper lands.
- Every PR needs an inspected PCB visual snapshot and benchmark-effect analysis.
  Report exact inputs, versions, budgets, completion, checks and elapsed time;
  identify measurements made on shared hardware. Include relevant upstream
  solver benchmark results. Do not merge without that evidence.
- Validate the completed native output with the routing, via and model checks.
  A successful partial phase is not evidence that the whole board is routed.
