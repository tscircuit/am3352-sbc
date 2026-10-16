# Fresh routing diagnostics

The board uses native phases only. Nothing in this directory is imported by its source, applied to installed dependencies, or used to manufacture copper.

- [Exact native DDR inputs](fresh-ddr/README.md): the complete obstacle sets and current 0.30/0.50 mm via rules, with hashes and outcomes.
- [Fanout regression patch](fanout-layer/README.md): a separately tested source-wire layer check, plus unchanged through-via blocking controls. Baseline: 2 pass / 1 fail; candidate: 3 pass. This does not establish the cause of the board's later lane-search stall.

## Useful solver work

1. Fix the off-layer source-wire rejection in `fanout-solver`. Preserve clearance checks on every physical layer occupied by a through via. The included patch is unapplied.
2. Verify the implementation actually executed by Core after publishing bus-lanes changes. Core 0.0.2164 inlines its bus solver; installing standalone 0.0.25 does not replace it. Both inspected implementations lack the paired-offset fix from [bus-lanes PR #59](https://github.com/tscircuit/bus-lanes-solver/pull/59). That fix has not been shown to resolve these current inputs.
3. Use the full current byte fixture for bounded routing/performance regression. Older DDR samples have different via rules and obstacles. A successful reduced sample is insufficient evidence for this board.
4. Forward the existing internal `stats` through `BusLanesAutorouter` progress events. Attempts, lane, expanded vertices, frontier and failure code are already available internally. Add the active connection and retry reason so a long search identifies its blocker.
5. Record the executed solver package/build identity in existing diagnostics. The CLI already has checkpoints, SRJ/constructor-input dumps and a configured `autorouterVersion` field; that field does not identify Core's embedded solver build.

Source inspection of released Core found bounded search, not an infinite-loop proof: an 800,000-iteration aggregate pipeline budget on four layers, finite candidate orders, and a 4,000-expanded-vertex cutoff for the current vector lane search. The logged percentage is temporary candidate progress; retries reset it. Timeouts do not prove that a legal route is impossible.
