# Fresh native routing attempts

**INCOMPLETE — zero complete fresh phases accepted. Attempt 07 timed out.**

tscircuit **0.0.2908**, Core **0.0.2164**, CLI **0.1.2347**; through vias **0.30 mm drill / 0.50 mm pad**. Conventional TSX and released native phases; no manual copper, saved-copper replay, project solver forks or CircuitJSON postprocessing.

Source coverage: **927 source traces, 108 named nets, 178 electrical groups**, all assigned to phases. This does not establish routed connectivity.

| Attempt | Observed duration | Result |
| --- | --- | --- |
| 01 | 42.2 s overall | Setup/build errors; no routing accepted. |
| 02 | 113.5 s DDR phase | Whole 46-signal `bus_lanes`: no collision-free local dogbone assignment. |
| 03 | 15 min DDR phase | Split DDR; first 11-signal byte phase timed out. |
| 04 | 30 min DDR phase | TOP-only byte trial timed out. |
| 05 | 242.8 s overall | Default DDR trial stopped at the 15.5 GiB shared-memory guard; no completed output or layer-use validation. This was not an algorithmic no-path result. |
| 06 | 775.4 s overall | Original RAM pose `(0,-27,0°)`; controlled interruption to try layer cohorts, not an algorithmic failure. No phase accepted. |
| 07 | 30 min DDR phase | Original RAM pose, disjoint TOP/BOTTOM DDR cohorts and shared whole-group length windows; timed out in `lanes_route` after 572,200 steps. No phase accepted. |

The isolated fanout regression yielded baseline **1 failed / 2 passed**, candidate **3 passed**. Its patch remains unapplied; the board failure's cause is not proved by that test. Native caching exists, but `bus_lanes` is uncached; released Core's embedded bus solver and separately tested **0.0.25** lack upstream **PR #59**.

No complete fresh routing, full-board DRC, timing, model-validation or fabrication sign-off is claimed. Generated diagnostic output and partial solver progress are not accepted copper.

TypeScript checks passed for the current configuration. The native CLI build exited 1; no finished site was generated or deployed. Native ground stitching and full-board checks remain pending. Exact inputs and a separately tested, unapplied fanout patch are in [routing/repros](routing/repros/README.md).
