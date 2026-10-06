import { BusLanesPipelineSolver, pairLengthReports, exteriorPairSpacingReports, type SimpleRouteJson } from "./vendor/bus-lanes-outer.js";
import { compactRoutingInput } from "./compact-routing-input";
import { mkdirSync, writeFileSync } from "node:fs";

/** Board-world points in mm, +X right and +Y up. Preserve fixed DDR copper;
 * route pairs on the outer layers of the physical four-layer board. */
export async function peripheralBusLanes(input: SimpleRouteJson) {
  const prepared = compactRoutingInput(structuredClone(input));
  prepared.obstacles = prepared.obstacles.filter(o => !(o as any).isCopperPour);
  prepared.allowedLayers = ["top", "bottom"];
  for (const bus of prepared.buses ?? []) bus.allowedLayers = ["top", "bottom"];
  const expectedPairs = prepared.differentialPairs?.length ?? 0;
  if (prepared.layerCount !== 4 || prepared.connections.length !== 24 || expectedPairs !== 12)
    throw new Error("Peripheral routing requires 24 native connections, 12 differential pairs, and four physical layers");
  const diagnosticDirectory = "work/peripheral-routing";
  mkdirSync(diagnosticDirectory, { recursive: true });
  writeFileSync(`${diagnosticDirectory}/input.simple-route.json`, JSON.stringify(prepared));
  const solver = new BusLanesPipelineSolver(prepared, {
    strictSurfacePairPrefixes: true,
    maxTimedSurfaceVias: 4,
    maxSearchIterations: 2_000_000,
    maxLaneIterations: 1_000_000,
  });
  const handlers: Record<string, ((event: any) => void)[]> = {};
  const emit = (type: string, event: object) => handlers[type]?.forEach(fn => fn({ type, ...event }));
  const finish = () => {
    solver.tryFinalAcceptance();
    if (!solver.solved) throw new Error(solver.error ?? "Peripheral pair routing did not complete");
    const pairs = pairLengthReports(prepared, solver.traces);
    const coupling = exteriorPairSpacingReports(prepared, solver.traces);
    if (solver.traces.length !== prepared.connections.length || pairs.length !== expectedPairs ||
      pairs.some(p => !p.matched) || coupling.length !== expectedPairs ||
      coupling.some(p => !p.applicable || !p.matched))
      throw new Error("Peripheral pairs failed complete routing, skew, or coupling validation");
    writeFileSync(`${diagnosticDirectory}/result.json`, JSON.stringify({ solved: solver.solved, pairs, coupling, traces: solver.traces }, null, 2));
    return solver.traces;
  };
  return {
    input, isRouting: false,
    on(type: string, fn: (event: any) => void) { (handlers[type] ??= []).push(fn); },
    stop() { this.isRouting = false; solver.tryFinalAcceptance(); },
    async start() {
      this.isRouting = true;
      const started = performance.now(); let nextLog = started + 15000;
      try {
        while (this.isRouting && !solver.solved && !solver.failed && performance.now() - started < 1800000) {
          const until = performance.now() + 30;
          do { solver.step(); } while (!solver.solved && !solver.failed && performance.now() < until);
          if (performance.now() > nextLog) { console.log(JSON.stringify({ router: "peripheral_bus_lanes", phase: solver.phase, iterations: solver.iterations, seconds: (performance.now() - started) / 1000 })); nextLog += 15000; }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (!this.isRouting) return;
        this.isRouting = false;
        emit("complete", { traces: finish() });
      } catch (error) { this.isRouting = false; emit("error", { error }); }
    },
    solveSync() { solver.solve(); return finish(); },
  };
}
