import type { AutorouterEvent, GenericLocalAutorouter, Obstacle, SimpleRouteJson, SimplifiedPcbTrace } from "@tscircuit/core";
import { FanoutSolver, buildOutputSimpleRouteJson, routeMixedSurfaceSourcePrefixesSteps, validateFanoutSolution, type FanoutRoutePlan } from "@tscircuit/fanout-solver";
import { compactRoutingInput } from "./compact-routing-input";
import { createOuterAutorouter, outerAutorouter, type OuterAutorouterOptions } from "./outer-autorouter";
import { filterUnchangedPreloadedTraces, manufactureOuterVias, outerSignalConnections, PHYSICAL_STACK, validateOuterRoutes } from "./outer-route-validation";

type Carrier = Awaited<ReturnType<typeof outerAutorouter>>;
export type LcdAutorouterOptions = OuterAutorouterOptions & { maxSourceMilliseconds?: number };
const EPSILON = 1e-7;
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) <= EPSILON;

function sourceGeometry(input: SimpleRouteJson) {
  const pads = input.obstacles.filter(obstacle => obstacle.componentId && obstacle.circuitJsonMetadata?.pcb_port_id && !obstacle.isCopperPour &&
    !(obstacle as Obstacle & { isNonPlatedHole?: boolean }).isNonPlatedHole &&
    !obstacle.circuitJsonMetadata?.pcb_via_id && !obstacle.circuitJsonMetadata?.pcb_plated_hole_id);
  const matches = (point: SimpleRouteJson["connections"][number]["pointsToConnect"][number], pad: Obstacle) =>
    !!point.pcb_port_id && pad.circuitJsonMetadata?.pcb_port_id === point.pcb_port_id;
  const candidates = [...new Set(pads.map(pad => pad.componentId!))].map(componentId => {
    const componentPads = pads.filter(pad => pad.componentId === componentId);
    return { componentId, componentPads, sources: input.connections.map(connection =>
      connection.pointsToConnect.flatMap((point, index) => componentPads.some(pad => matches(point, pad)) ? [index] : [])) };
  }).filter(candidate => candidate.sources.every(indices => indices.length === 1))
    .sort((a, b) => b.componentPads.length - a.componentPads.length || a.componentId.localeCompare(b.componentId));
  if (!candidates.length || candidates[1]?.componentPads.length === candidates[0]!.componentPads.length)
    throw new Error("LCD routing requires one unambiguous native source footprint for every connection");
  const { componentId, componentPads, sources } = candidates[0]!;
  return { componentId, sources: sources.map(indices => indices[0]!) };
}

function joinCompletePaths(input: SimpleRouteJson, plans: FanoutRoutePlan[], fragments: SimplifiedPcbTrace[]): SimplifiedPcbTrace[] {
  return input.connections.map((connection, index) => {
    const plan = plans.find(plan => plan.connectionIndex === index)!;
    const source = connection.pointsToConnect[plan.sourcePointIndex]!;
    const target = connection.pointsToConnect[1 - plan.sourcePointIndex]!;
    let remaining = fragments.filter(trace => trace.connection_name === connection.name);
    const route: SimplifiedPcbTrace["route"] = [];
    let cursor = { x: source.x, y: source.y, layer: plan.sourceLayer };
    while (remaining.length) {
      const matches = remaining.flatMap((trace, traceIndex) => {
        const first = trace.route[0], last = trace.route.at(-1);
        if (first?.route_type === "wire" && first.layer === cursor.layer && near(first, cursor)) return [{ traceIndex, points: trace.route }];
        if (last?.route_type !== "wire" || last.layer !== cursor.layer || !near(last, cursor)) return [];
        const reversed = trace.route.toReversed().map(point => point.route_type === "via" ? { ...point, from_layer: point.to_layer, to_layer: point.from_layer } :
          point.route_type === "through_obstacle" ? { ...point, start: point.end, end: point.start, from_layer: point.to_layer, to_layer: point.from_layer } :
            { ...point,
              start_pcb_port_id: "end_pcb_port_id" in point && typeof point.end_pcb_port_id === "string" ? point.end_pcb_port_id : undefined,
              end_pcb_port_id: "start_pcb_port_id" in point && typeof point.start_pcb_port_id === "string" ? point.start_pcb_port_id : undefined });
        return [{ traceIndex, points: reversed }];
      });
      if (matches.length !== 1) throw new Error(`LCD ${connection.name} does not have one complete native path`);
      const match = matches[0]!;
      route.push(...(route.length ? match.points.slice(1) : match.points));
      remaining = remaining.filter((_, traceIndex) => traceIndex !== match.traceIndex);
      const last = route.at(-1);
      if (last?.route_type !== "wire") throw new Error(`LCD ${connection.name} has a discontinuous terminal handoff`);
      cursor = last;
    }
    const targetLayers = target.layers ?? (target.layer ? [target.layer] : []);
    if (!route.length || !near(cursor, target) || !targetLayers.includes(cursor.layer))
      throw new Error(`LCD ${connection.name} misses its original native endpoint`);
    return { type: "pcb_trace", pcb_trace_id: `lcd:${connection.name}`, connection_name: connection.name,
      source_trace_id: connection.source_trace_id ?? connection.name, route };
  });
}

/** Compute all LCD source prefixes from native SRJ, then route carriers with
 * those prefixes and every earlier phase held as immutable supplied copper. */
export async function lcdAutorouter(input: SimpleRouteJson, options: LcdAutorouterOptions = {}): Promise<GenericLocalAutorouter & {
  readonly solver: Carrier["solver"] | undefined;
  getOutputSimplifiedPcbTraces(): SimplifiedPcbTrace[];
  getOutputSimpleRouteJson(): SimpleRouteJson | undefined;
}> {
  if (input.layerCount !== 4 || input.connections.length !== 20 || input.connections.some(connection => connection.pointsToConnect.length !== 2))
    throw new Error("LCD routing requires all 20 native two-terminal connections on four physical layers");
  if (options.maxSourceMilliseconds !== undefined && (!Number.isFinite(options.maxSourceMilliseconds) || options.maxSourceMilliseconds < 0))
    throw new Error("LCD source time budget must be a non-negative finite number");
  const original = JSON.stringify(input);
  const nativeClone = structuredClone(input);
  const prepared = compactRoutingInput({ ...nativeClone, connections: outerSignalConnections(nativeClone, options.groundNetIds) });
  // The public fanout package also accepts multilayer terminals and requires
  // named supplied traces. Retain the core's single-layer terminal records and
  // prove the narrower trace ownership contract without changing copper.
  const fanoutInput = { ...prepared, traces: prepared.traces?.map(trace => {
    if (!trace.connection_name) throw new Error(`Supplied LCD copper ${trace.pcb_trace_id} has no native connection owner`);
    return { ...trace, connection_name: trace.connection_name };
  }) };
  const { componentId, sources } = sourceGeometry(prepared);
  const traceWidth = prepared.minTraceWidth;
  const clearance = prepared.defaultObstacleMargin ?? 0.1;
  const viaDiameter = prepared.min_via_pad_diameter ?? prepared.minViaPadDiameter ?? prepared.minViaDiameter ?? 0.3;
  const viaHoleDiameter = prepared.min_via_hole_diameter ?? prepared.minViaHoleDiameter ?? 0.15;
  const fanout = new FanoutSolver(fanoutInput, { sourceComponentId: componentId,
    buses: prepared.connections.map(connection => ({ busId: connection.name, connectionNames: [connection.name], sourceComponentId: componentId,
      allowedLayers: connection.allowedLayers })), escapeLayers: ["top", "bottom"], allowBlindAndBuriedVias: false,
    traceWidth, clearance, viaDiameter, viaHoleDiameter });
  const boundary = fanout.preparedBuses[0]!.sharedBoundary;
  if (boundary.minX < input.bounds.minX || boundary.maxX > input.bounds.maxX || boundary.minY < input.bounds.minY || boundary.maxY > input.bounds.maxY)
    throw new Error("LCD source breakout boundary exceeds the native board bounds");
  const work = routeMixedSurfaceSourcePrefixesSteps({ srj: fanoutInput, buses: fanout.preparedBuses, traceWidth, clearance,
    viaDiameter, viaHoleDiameter, gridStep: (traceWidth + clearance) / 2 });
  const handlers: Record<string, ((event: AutorouterEvent) => void)[]> = {};
  const emit = (event: AutorouterEvent) => handlers[event.type]?.forEach(handler => handler(event));
  let carrier: Carrier | undefined, prefixes: SimplifiedPcbTrace[] | undefined, plans: FanoutRoutePlan[] | undefined;
  let traces: SimplifiedPcbTrace[] | undefined, started = false;
  const sourceOutput = (computed: FanoutRoutePlan[] | null): SimpleRouteJson => {
    if (!computed || computed.length !== 20 || computed.some(plan => plan.sourcePointIndex !== sources[plan.connectionIndex]))
      throw new Error("LCD source escape did not complete every original native source");
    const output = buildOutputSimpleRouteJson({ inputSrj: fanoutInput, plans: computed, layerNames: [...PHYSICAL_STACK] });
    const contract = validateFanoutSolution({ inputSrj: fanoutInput, outputSrj: output, plans: computed, preparedBuses: fanout.preparedBuses,
      sharedBoundary: boundary, clearance, allowBlindAndBuriedVias: false });
    if (!contract.valid) throw new Error(`LCD source prefixes failed their public contract: ${JSON.stringify(contract.issues)}`);
    const manufactured = computed.map(plan => manufactureOuterVias(plan.trace, input));
    const local = { ...input, connections: computed.map(plan => ({ ...input.connections[plan.connectionIndex]!, pointsToConnect: [
      input.connections[plan.connectionIndex]!.pointsToConnect[plan.sourcePointIndex]!, { ...plan.exitPoint, layer: plan.targetLayer },
    ] })) };
    validateOuterRoutes(local, manufactured, options.groundNetIds);
    filterUnchangedPreloadedTraces(input, [...(input.traces ?? []), ...manufactured]);
    if (JSON.stringify(input) !== original) throw new Error("Native LCD input changed during source escape");
    plans = computed; prefixes = manufactured;
    return { ...prepared, connections: prepared.connections.map((connection, index) => ({ ...connection,
      pointsToConnect: output.connections[index]!.pointsToConnect.map(point => {
        if (!("layer" in point) || typeof point.layer !== "string") throw new Error("LCD handoffs must preserve actual single-layer core terminals");
        return { ...point, layer: point.layer };
      }),
    })), traces: [...(input.traces ?? []), ...manufactured] };
  };
  const checkedOutput = () => {
    if (traces) return traces;
    if (!carrier || !plans || !prefixes) throw new Error("LCD routing did not complete");
    const fragments = [...prefixes, ...carrier.getOutputSimplifiedPcbTraces()];
    const full = joinCompletePaths(input, plans, filterUnchangedPreloadedTraces(input, fragments));
    const accepted = validateOuterRoutes(input, full, options.groundNetIds);
    if (accepted.length !== 20 || JSON.stringify(input) !== original) throw new Error("LCD routing changed native input or omitted complete paths");
    traces = accepted;
    return traces;
  };
  const adapter: GenericLocalAutorouter & { readonly solver: Carrier["solver"] | undefined; getOutputSimplifiedPcbTraces(): SimplifiedPcbTrace[]; getOutputSimpleRouteJson(): SimpleRouteJson | undefined } = {
    input, get solver() { return carrier?.solver; }, isRouting: false,
    on(type, callback) { (handlers[type] ??= []).push(callback as (event: AutorouterEvent) => void); },
    stop() { this.isRouting = false; carrier?.stop(); },
    async start() {
      if (started) throw new Error("LCD autorouter may only be started once");
      started = true; this.isRouting = true;
      const start = performance.now();
      try {
        let next = work.next(), steps = 0;
        while (this.isRouting && !next.done) {
          const until = performance.now() + (options.timeSliceMilliseconds ?? 30);
          do {
            if (performance.now() - start >= (options.maxSourceMilliseconds ?? 180000)) throw new Error("LCD source escape exceeded its time budget");
            next = work.next(); steps++;
          } while (this.isRouting && !next.done && performance.now() < until);
          emit({ type: "progress", steps, progress: 0, phase: "lcdSourcePrefixes" });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (!this.isRouting) { work.return(null); return; }
        if (!next.done) throw new Error("LCD source escape stopped before completion");
        carrier = await outerAutorouter(sourceOutput(next.value), options);
        if (!this.isRouting) { carrier.stop(); return; }
        carrier.on("progress", emit);
        carrier.on("error", event => { this.isRouting = false; emit(event); });
        carrier.on("complete", () => {
          try { const complete = checkedOutput(); this.isRouting = false; emit({ type: "complete", traces: complete }); }
          catch (error) { this.isRouting = false; emit({ type: "error", error: error instanceof Error ? error : new Error(String(error)) }); }
        });
        await carrier.start();
      } catch (error) { this.isRouting = false; work.return(null); emit({ type: "error", error: error instanceof Error ? error : new Error(String(error)) }); }
    },
    solveSync() {
      if (started) throw new Error("LCD autorouter may only be started once");
      started = true;
      const start = performance.now();
      let next = work.next();
      while (!next.done) {
        if (performance.now() - start >= (options.maxSourceMilliseconds ?? 180000)) {
          work.return(null);
          throw new Error("LCD source escape exceeded its time budget");
        }
        next = work.next();
      }
      carrier = createOuterAutorouter(sourceOutput(next.value), options);
      carrier.solveSync();
      return checkedOutput();
    },
    getOutputSimplifiedPcbTraces() { return checkedOutput(); },
    getOutputSimpleRouteJson() { return traces ? { ...input, traces: [...(input.traces ?? []), ...traces] } : undefined; },
  };
  return adapter;
}
