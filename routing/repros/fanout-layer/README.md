# Fanout source-wire layer regression

This diagnostic patch targets `tscircuit/fanout-solver`, released package `@tscircuit/fanout-solver@0.0.78`. It filters opposite-layer obstacles only when checking a source wire segment. The through-via site still checks every supplied obstacle. The patch is not loaded by this board or its installed runtime.

The patch contains the one-line library change and one standalone three-case Bun test. With 0.8 mm BGA pitch, 0.4 mm circular pads, 0.5/0.3 mm via land/drill, 0.1 mm trace width and 0.1 mm clearance, it checks:

- A BOTTOM obstacle crossing a TOP stub, clear of the via, retains the candidate.
- The same obstacle on TOP rejects the candidate.
- A BOTTOM obstacle at the full-span via still rejects the candidate.

The unchanged release produced 2 passing tests and 1 failure; the candidate produced 3 passing tests and 0 failures. ROOT ran these separately using Bun 1.4.0 (34cbb9a40) with `--smol`; the retained logs are copied byte-for-byte. These focused results establish the false obstacle rejection, not that the patch fixes the board's routing stall. No full-board rerun with this patch is claimed. The package's upstream repository is https://github.com/tscircuit/fanout-solver; no upstream Git commit or applicability to current upstream HEAD has been verified.

The already completed isolated commands were:

```sh
cd /workspace/work/am3352-fanout-layer-repro
/workspace/.cloud-tools/node_modules/bun/bin/bun.exe --smol test ./baseline/tests/component-dogbone-layer.test.ts
/workspace/.cloud-tools/node_modules/bun/bin/bun.exe --smol test ./tests/component-dogbone-layer.test.ts
```

For upstream review, the patch uses normal `a/lib` / `b/lib` paths and adds `tests/component-dogbone-layer.test.ts`. In a separate compatible fanout-solver checkout, the unchanged library with that test is the red control; the same test with the one-line change is the green control. This board commit stores the patch as a diagnostic artifact; it adds no dependency override, build hook, custom autorouter or runtime patch. The self-contained fixture requires no board input, so no large native-input copy is needed.

`provenance.json` records the exact released-package, source, test, patch and retained-log hashes. The original isolated source copy and its historical author-time receipt remain unchanged.
