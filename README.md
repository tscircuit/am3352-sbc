# AM3352 SBC — partial outer-layer routing

This repository was created as `tscircuit/am3552-sbc` from the current
[`astra/am3352-sbc`](https://tscircuit.com/astra/am3352-sbc) source, version
`0.1.19`. The processor is the AM3352; the repository name follows the requested
destination.

The four-layer board is configured for new signal routing on **Top and Bottom**,
with **inner1 and inner2 declared as unbroken GND planes**. Layer transitions use
full-stack through vias on the 1.6 mm board. The RAM remains below the processor
at `(-10, -32)`, rotated 270 degrees. Local Top power pours and Bottom GND are
also retained.

**This is a partial routing checkpoint.** The inherited 47 DDR paths still use
inner layers and must be replaced before the board satisfies this layer plan.
The accepted outer-route cache is empty. DDR length matching, USB/TMDS pairs,
LCD and control routing, power connectivity and both ground-plane audits still
need whole-board acceptance. The existing files in `output/` belong to the
imported source checkpoint, not an accepted Top/Bottom reroute.

The branch includes separate native routing phases for DDR, USB/TMDS, LCD,
control/boot, power and ground. The adapters hydrate authored copper as fixed
geometry and retain independent connectivity, clearance, timing and through-via
checks. They provide the routing infrastructure; they do not establish that the
complete board has been routed.

Install and check the committed dependency packages:

```sh
bun install --frozen-lockfile
bun run check:autorouter-vendor
bun run check:fanout-vendor
bun run typecheck
bun run test:routing
bun run build:placement
```

`build:placement` saves a placement checkpoint under `work/builds/placement/`.
Automatic PR checks verify dependencies, types, routing tests and that placement
render. The workflow's optional `full_board_signoff` dispatch input runs the
complete build and physical audit when a full reroute is available.

To continue routing, `bun run route:ddr-outer` must produce all 47 validated
Top/Bottom DDR paths before `bun run build` can route and audit the remaining
phases. The full build deliberately rejects the inherited inner-layer DDR paths.
Failed and partial attempts stay in `work/`; only a complete audited board can
replace the published routing output. `bun run cache:routing` records a
successful build for native phase replay.

PCB visual regression tests replay the saved DDR checkpoint on all four copper
layers. `bun run test:pcb` compares the rendered images with the committed
baselines. After changing placement or accepted routes, run
`bun run snapshot:pcb`, inspect the PNGs under `tests/__snapshots__/`, and commit
both the SVG and PNG files. CI uploads magenta-highlighted diff images when a
snapshot changes. The initial baselines show the inherited checkpoint, whose DDR still fails
Top/Bottom routing acceptance. Visual snapshots document geometry; DDR routing
acceptance and complete-board signoff remain mandatory separate checks.
See [the PCB snapshot gallery](docs/pcb-snapshots/README.md) for the images and
the DDR regeneration result.
