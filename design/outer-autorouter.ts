import { SOLVERS, type AutorouterEvent, type GenericLocalAutorouter, type SimpleRouteJson, type SimplifiedPcbTrace } from "@tscircuit/core";
import { filterUnchangedPreloadedTraces, outerGroundOwners, validateOuterRoutes } from "./outer-route-validation";
import { compactRoutingInput } from "./compact-routing-input";

type Pipeline = InstanceType<typeof SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph>;
export type OuterAutorouterOptions = {
  solverOptions?: ConstructorParameters<typeof SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph>[1];
  maxIterations?: number;
  maxMilliseconds?: number;
  timeSliceMilliseconds?: number;
  /** Additional aliases, if the native input contains multiple ground names. */
  groundNetIds?: string[];
};

/** A local, actual-four-layer router; the two inner ground pours remain reserved. */
export async function outerAutorouter(input: SimpleRouteJson, options: OuterAutorouterOptions = {}): Promise<GenericLocalAutorouter & {
  solver: Pipeline;
  getOutputSimplifiedPcbTraces(): SimplifiedPcbTrace[];
  getOutputSimpleRouteJson(): SimpleRouteJson | undefined;
}> {
  outerGroundOwners(input, options.groundNetIds);
  const original = JSON.stringify(input);
  const prepared = structuredClone(input);
  prepared.allowBlindAndBuriedVias = false;
  prepared.allowJumpers = false;
  prepared.minViaPadDiameter ??= prepared.min_via_pad_diameter ?? prepared.minViaDiameter ?? 0.3;
  prepared.minViaHoleDiameter ??= prepared.min_via_hole_diameter ?? 0.15;
  const solver = new SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph(compactRoutingInput(prepared) as ConstructorParameters<typeof SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph>[0], {
    ...options.solverOptions, cacheProvider: null,
  });
  const handlers: Record<string, ((event: AutorouterEvent) => void)[]> = {};
  const emit = (event: AutorouterEvent) => handlers[event.type]?.forEach(handler => handler(event));
  let traces: SimplifiedPcbTrace[] | undefined;
  let startedAt = 0;
  let started = false;
  const budget = () => {
    if (options.maxIterations !== undefined && solver.iterations >= options.maxIterations)
      throw new Error(`Outer routing exceeded ${options.maxIterations} iterations`);
    if (options.maxMilliseconds !== undefined && performance.now() - startedAt >= options.maxMilliseconds)
      throw new Error(`Outer routing exceeded ${options.maxMilliseconds} ms`);
  };
  const checkedOutput = () => {
    if (traces) return traces;
    if (!solver.solved || solver.failed) throw new Error(solver.error ?? "Outer routing did not complete");
    if (JSON.stringify(input) !== original) throw new Error("Native routing input changed while routing");
    const output = solver.getOutputSimpleRouteJson() as SimpleRouteJson;
    if (output.layerCount !== input.layerCount) throw new Error("Autorouter changed the physical layer count");
    // Check the full output as well as the callback list: the latter excludes
    // untouched preloaded routes and must never hide a mutated supplied route.
    filterUnchangedPreloadedTraces(input, output.traces ?? []);
    const outputIds = new Set((output.traces ?? []).map(trace => trace.__replaces_pcb_trace_id ?? trace.pcb_trace_id));
    if ((input.traces ?? []).some(trace => !outputIds.has(trace.pcb_trace_id)))
      throw new Error("Autorouter dropped a supplied trace");
    traces = validateOuterRoutes(input, solver.getOutputSimplifiedPcbTraces() as SimplifiedPcbTrace[], options.groundNetIds);
    return traces;
  };
  const adapter: GenericLocalAutorouter & { solver: Pipeline; getOutputSimplifiedPcbTraces(): SimplifiedPcbTrace[]; getOutputSimpleRouteJson(): SimpleRouteJson | undefined } = {
    input, solver, isRouting: false,
    on(type, callback) { (handlers[type] ??= []).push(callback as (event: AutorouterEvent) => void); },
    stop() { this.isRouting = false; },
    async start() {
      if (started) throw new Error("Outer autorouter may only be started once");
      started = true; startedAt = performance.now(); this.isRouting = true;
      try {
        while (this.isRouting && !solver.solved && !solver.failed) {
          const until = performance.now() + (options.timeSliceMilliseconds ?? 30);
          do { budget(); solver.step(); } while (this.isRouting && !solver.solved && !solver.failed && performance.now() < until);
          emit({ type: "progress", steps: solver.iterations, progress: solver.progress, phase: solver.getCurrentPhase() ?? undefined });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (!this.isRouting) return;
        this.isRouting = false;
        emit({ type: "complete", traces: checkedOutput() });
      } catch (error) {
        this.isRouting = false;
        emit({ type: "error", error: error instanceof Error ? error : new Error(String(error)) });
      }
    },
    solveSync() {
      if (started) throw new Error("Outer autorouter may only be started once");
      started = true; startedAt = performance.now();
      while (!solver.solved && !solver.failed) { budget(); solver.step(); }
      return checkedOutput();
    },
    getOutputSimplifiedPcbTraces() { return checkedOutput(); },
    getOutputSimpleRouteJson() {
      if (!traces) return undefined;
      return { ...input, traces: [...(input.traces ?? []), ...traces] };
    },
  };
  return adapter;
}
