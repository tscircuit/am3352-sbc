# Fresh DDR native inputs

These gzip files contain byte-for-byte native Simple Route JSON emitted by the official CLI. They are diagnostic fixtures only; the board never imports them. `provenance.json` records the original and compressed hashes, dimensions, placement and observed outcomes.

- `whole-ddr`: all 46 matched signals, RAM at `(-10,-32,270°)`. The native phase reported **No collision-free local dogbone assignment** after 113.5 seconds. The separately installed bus-lanes 0.0.25 also rejected this input in 1.3 seconds.
- `byte0-layer-cohorts`: 11 signals, RAM at `(0,-27,0°)`. Two disjoint layer cohorts share the **33.585277–34.220277 mm** length window; the DQS pair stays on TOP. Routing outcome is recorded in the provenance and root routing status.

Both retain all 1,144 obstacles, zero previous traces, and 0.30 mm drill / 0.50 mm pad through vias. No obstacles, net ownership, copper or constraints were edited in these inputs. Historical reduced DDR benchmarks use different obstacles and via dimensions; their success does not certify these fixtures.

Reproduce the current source trial from the project root with the pinned dependencies:

```sh
bun install --frozen-lockfile
bun --smol node_modules/tscircuit/cli.mjs build index.circuit.tsx \
  --disable-parts-engine --autorouter-timeout 30m \
  --autorouter-dump-srj phase:1 --autorouter-debug-dir work/ddr-debug
```

Core 0.0.2164 inlines its native bus solver. Installing a newer standalone bus-lanes package does not replace that implementation. Candidate progress is temporary search state; only a completed, validated phase counts as routed. The separate [fanout patch](../fanout-layer/README.md) is unapplied and has not been shown to resolve this full-board search.
