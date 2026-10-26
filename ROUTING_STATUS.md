# Native routing validation

The current source uses Dogbone PR #6, fanout 0.0.81, the native cached
follow-up fix (Core #4916), lazy progress graphics (Core #4920), native four-layer
via stitching (via-stitch-solver #12), and the capacity topology fixes recorded
in `vendor/` (including #3267 and #3270). Stitch pitch is 3 mm; all vias have 0.30 mm drills
and at least 0.50 mm lands through the full four-layer stack.

**All 46 critical DDR carriers have completed and passed their original timing,
pair coupling, full copper DRC and manufacturing-via checks.** The independently
validated native result is cached. Byte-identical inputs reuse that result;
no cache payloads have been edited. DDR routing took 106.6 minutes on this
shared four-CPU workspace. Native support and whole-board routing are still
in progress; full-board validation and publication remain pending.

The next attempt uses the corrected target restoration that preserves clipped
pad regions and existing coordinate normalization. Its 14 topology fixtures,
exact T113 native regression and Muse clearance controls pass. The preliminary
native support retry was stopped after 20.9 minutes to use this correction;
it had passed topology merging and was constructing graph edges. This was a
controlled stop, not a timeout or an infeasible result.

The indexed target-edge retry adds an incident-edge and spatial broad-phase
index while preserving edge IDs/order and the existing predicates. Three
native graph controls (24 assertions) and a compiled two-phase smoke pass.
The prior full-board run was stopped after roughly 46 minutes because graph
completion still used quadratic scans; this was a controlled replacement, not
a demonstrated routing failure. Paired Blacksmith results remain pending.

Custom phases use the native cache, keyed by the complete input and explicit
engine identity. No captured routes are imported, and generated Circuit JSON is
never rewritten. The final phase plan groups controls and power to avoid
repeating fixed-copper mesh construction for each individual net.

Before publication, the completed native output must pass all 23 routing checks,
the manufacturing-via check, and actual loading of all 229 component models.
The build must then be exported with the official `tsci build --site` command.

Upstream benchmark effects: Core's paired handoff fixture retains 2 traces with
no errors and unchanged earlier copper; obstacles drop from 29 to 11. Capacity's
paired canonical benchmark passes 85/85 with relaxed DRC on both revisions,
with no lost cases; median time is 2.483 to 2.266 seconds on Blacksmith. The
rectdiff pipeline-to-port-path benchmark remains 202/207 on both revisions,
with the same five iteration failures. The separate bus-lanes legacy benchmark
is **9/11 on both revisions**, so 11/11 has not been established. These are
upstream measurements, not proof of this board's final connectivity.

No PRs have been merged during this work. Final board timing, checks, inspected
PCB snapshot, and public preview URL will be recorded after completion.
