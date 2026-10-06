// The old DDR builder waived missing/dangling native routes and then replaced
// the saved cache. All new routes must pass the outer-layer generation gate.
throw new Error("Legacy DDR cache builder is disabled. Run route:ddr-outer to generate and independently validate all 47 DDR routes; build:checkpoint only inspects an accepted cache.");
