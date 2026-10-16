# AM3352 SBC

Conventional TSX source project using tscircuit 0.0.2908 / core 0.0.2164. `index.circuit.tsx` generates the PCB and a native 15-sheet schematic. Parts, nets, placements, pours and schematic pin banks are source declarations.

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run check:routing
bun run build:site
```

This branch routes from component and net declarations using released native autorouters. It contains no saved copper, project solver forks or Circuit JSON post-processing. DDR runs first; the phase plan assigns each complete electrical net to one phase. Through vias use a 0.30 mm drill and 0.50 mm copper pad.

`bun run build` uses the official CLI directly on `index.circuit.tsx`. The CLI's native phase cache and diagnostics remain available. Run `bun run build:site` to produce the inspection site.

Standard JST SH UART: **1 RX, 2 GND, 3 TX**, 3.3 V TTL / 115200 8N1. Power JST: external regulated **5 V**, selected with JP_PWR. The standard programmer's 50 mA output cannot power this SBC. AM3352 uses JTAG; ST-LINK V2/SWD is incompatible. See [BRINGUP-JST.md](BRINGUP-JST.md) and [ROUTING_ADVICE.md](ROUTING_ADVICE.md).

**Four-layer draft; do not fabricate yet.** The separate eight-layer corrections remain unfinished. The accepted routing also retains six supplemental LCD path findings; power-path current/thermal qualification and JLC manufacturing clearance review remain open.
