# AM3352 SBC

Conventional TSX source project using tscircuit 0.0.2870 / core 0.0.2146. `index.circuit.tsx` declares the PCB and native 15-sheet schematic. Parts, nets, placements, pours, stitching and schematic pin banks are source declarations.

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run check:routing
bun run check:vias
bun run check:models
bun run build:site
```

This branch targets **0.30 mm via drills / 0.45 mm copper lands**, with through vias only. Phase 0 retains 34 unchanged, via-free branches keyed by component pins, with placement checks. Every via-bearing net is assigned to fresh autorouting; the legacy 0.15 mm drill cache and its saved-routing mode have been removed. `routing/vias.json` declares native stitching vias, including all 16 DDR stitches. Nearby seed centers have minor clearance adjustments; optional BGA escape seeds are removed so the autorouter can allocate larger-via sites.

DDR uses the official bus-lanes solver 0.0.25, solving complete timing buses in sequence and retaining earlier completed buses as fixed copper. It preserves matching and differential-pair constraints, retains every obstacle, and searches the CPU/RAM field with a 12 mm margin. Only complete validated solver output is accepted. Subsequent native phases route USB/TMDS, LCD, controls, power and ground. New routing requires renewed electrical and geometry validation.

`build.tsx` renders the TSX with core’s event-driven `renderUntilSettled()` API. This avoids the current CLI’s repeated full-tree polling on this dense board. It writes unmodified native output, then invokes `tsci build` (with `--site --use-cdn-javascript` for the viewer, keeping each hosted file below the Sites limit). The parts engine is disabled because the footprints are declared in source. `bun run check:routing` runs all 20 default routing checks in separate processes on the generated output to avoid concurrent geometry checks exceeding memory; native placement, netlist and schematic checks remain enabled. Temporary geometry is garbage-collected at phase boundaries.

There is no prebuilt board entry, Circuit JSON authoring input, schematic-output patcher, or copper/silkscreen post-processing.

Models can be checked independently of routing:

```sh
bun run build:model-fixture
bun run check:models:fixture
```

This renders a native placement fixture from the same component sources, omitting routing and the copper-pour producer before rendering. It is never a fabrication board. The check fetches external OBJ/STEP assets with viewer CORS headers and requires a finite, non-empty mesh from the official 3D converter for every part, including built-in footprint models. See [models/README.md](models/README.md) for package approximation limits.

Standard JST SH UART: **1 RX, 2 GND, 3 TX**, 3.3 V TTL / 115200 8N1. Power JST: external regulated **5 V**, selected with JP_PWR. The standard programmer's 50 mA output cannot power this SBC. AM3352 uses JTAG; ST-LINK V2/SWD is incompatible. See [BRINGUP-JST.md](BRINGUP-JST.md) and [ROUTING_ADVICE.md](ROUTING_ADVICE.md).

**Four-layer draft; do not fabricate yet.** Complete larger-via routing and its final electrical/clearance/pour checks are pending. Separate eight-layer corrections, power-path current/thermal qualification and JLC manufacturing clearance review remain open.

Current validation: 229/229 component meshes and all 46 external OBJ/STEP assets pass on the native placement fixture. Larger-via DDR routing has not completed: the sequential solver stays below the worker memory limit, but the address/clock cohort reaches the shared 200-second routing deadline without a validated solution. No partial route is exported. Full native builds and downstream routing/via/pour checks remain blocked at this phase; CI keeps model validation independent so its result is still visible.
