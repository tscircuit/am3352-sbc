# AM3352 SBC

Conventional TSX source project using tscircuit 0.0.3012 / core 0.0.2203 with the vendored phase-handoff fixes. `index.circuit.tsx` declares the PCB and a native 15-sheet schematic. Parts, nets, placements, pours and schematic pin banks are source declarations.

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run check:routing
bun run build:site
```

Routing is generated fresh from component and net declarations using autorouting
phases. The DDR phase uses a portable bundled solver implementation; the other
phases use native autorouters. There is no saved copper or CircuitJSON
post-processing. Each complete electrical net belongs to one phase. Through
vias use a 0.30 mm drill and 0.50 mm copper pad.

**Validation in progress:** all 46 critical DDR carriers pass their original constraints; native support and whole-board routing are still pending.
See [ROUTING_STATUS.md](ROUTING_STATUS.md). The portable DDR runtime includes
source-via face selection and conflict-directed replanning; its provenance is
recorded in `routing/runtime-provenance.json`.

`bun run build` uses the official CLI directly on `index.circuit.tsx`. The CLI's native phase cache and diagnostics remain available. Run `bun run build:site` to produce the inspection site.

Standard JST SH UART: **1 RX, 2 GND, 3 TX**, 3.3 V TTL / 115200 8N1. Power JST: external regulated **5 V**, selected with JP_PWR. The standard programmer's 50 mA output cannot power this SBC. AM3352 uses JTAG; ST-LINK V2/SWD is incompatible. See [BRINGUP-JST.md](BRINGUP-JST.md) and [ROUTING_ADVICE.md](ROUTING_ADVICE.md).

**Four-layer draft; do not fabricate yet.** The separate eight-layer corrections remain unfinished. Full-board routing validation, power-path current/thermal qualification and JLC manufacturing clearance/stackup review remain open.
