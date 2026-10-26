The DDR runtime is a browser-compatible ES module that generates fresh routes
from the native phase input. The TSX project supplies placements, nets and
constraints; it imports no saved copper and performs no Circuit JSON rewriting.

`shared-ddr-runtime.js.map` embeds the input source of every bundled module,
including the readable routing controller and its helpers. `runtime-provenance.json`
records their hashes, the bundle hash and its relationship to the standalone
portability test. The source-map comment changes no executable routing code.

The controller chooses a 47.75–48.385 mm CA matching band within the original
47.75–50.29 mm bounds and 0.635 mm skew limit. Original constraints remain the
authority for the independent final checks.
