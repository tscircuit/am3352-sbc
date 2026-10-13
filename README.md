# AM3352 SBC

Conventional TSX source project using tscircuit 0.0.2857 / core 0.0.2141. `index.circuit.tsx` generates the PCB and a native 15-sheet schematic. Parts, nets, placements, pours, stitching and schematic pin banks are source declarations.

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run check:routing
bun run build:site
```

The default `routingMode="saved"` retains the accepted autorouted copper through ordinary `<autoroutingphase />` algorithms. `routing/accepted-routes.ts` contains source routing inputs keyed by component pins, with placement checks. It contains no generated Circuit JSON IDs; its data is encoded as text to keep compiler memory small. `routing/vias.json` defines native stitching and escape vias.

To reroute changed placement or connectivity, run `tsci build index.circuit.tsx --inject-props '{"routingMode":"fresh"}'` or render `<Board routingMode="fresh" />`. The phases then use tscircuit's native autorouter. DDR runs first, followed by USB/TMDS, LCD, controls, power and ground. New routing requires renewed electrical and geometry validation.

`build.tsx` renders the TSX with core’s event-driven `renderUntilSettled()` API. This avoids the current CLI’s repeated full-tree polling on this dense board. It writes unmodified native output, then invokes `tsci build` (with `--site --use-cdn-javascript` for the viewer, keeping each hosted file below the Sites limit). The parts engine is disabled because the footprints are declared in source. `bun run check:routing` runs all 20 default routing checks in separate processes on the generated output to avoid concurrent geometry checks exceeding memory; native placement, netlist and schematic checks remain enabled. Temporary geometry is garbage-collected at phase boundaries.

There is no prebuilt board entry, Circuit JSON authoring input, schematic-output patcher, or copper/silkscreen post-processing.

Standard JST SH UART: **1 RX, 2 GND, 3 TX**, 3.3 V TTL / 115200 8N1. Power JST: external regulated **5 V**, selected with JP_PWR. The standard programmer's 50 mA output cannot power this SBC. AM3352 uses JTAG; ST-LINK V2/SWD is incompatible. See [BRINGUP-JST.md](BRINGUP-JST.md) and [ROUTING_ADVICE.md](ROUTING_ADVICE.md).

**Four-layer draft; do not fabricate yet.** The separate eight-layer corrections remain unfinished. The accepted routing also retains six supplemental LCD path findings; power-path current/thermal qualification and JLC manufacturing clearance review remain open.
