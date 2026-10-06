import type { AutorouterEvent, GenericLocalAutorouter, Obstacle, SimpleRouteJson, SimplifiedPcbTrace } from "@tscircuit/core";
import { FanoutSolver, buildOutputSimpleRouteJson, routeMixedSurfaceSourcePrefixesSteps, validateFanoutSolution, type FanoutRoutePlan } from "@tscircuit/fanout-solver";
import { compactRoutingInput } from "./compact-routing-input";
import { createOuterAutorouter, outerAutorouter, type OuterAutorouterOptions, type OuterRoutingAdapter } from "./outer-autorouter";
import { filterUnchangedPreloadedTraces, fixedConnectionComponents, manufactureOuterVias, outerSignalConnections, PHYSICAL_STACK, validateOuterRoutes } from "./outer-route-validation";

export type ControlAutorouterOptions = OuterAutorouterOptions & { maxSourceMilliseconds?: number };
type Connection = SimpleRouteJson["connections"][number];
type SourceMembership = { globalConnectionIndex: number; sourcePointIndex: number };
export type ControlRoutingAdapter = GenericLocalAutorouter & {
  readonly solver: OuterRoutingAdapter["solver"] | undefined;
  getOutputSimplifiedPcbTraces(): SimplifiedPcbTrace[];
  getOutputSimpleRouteJson(): SimpleRouteJson | undefined;
};

function nativeSourceMembership(input: SimpleRouteJson) {
  const pads = input.obstacles.filter(obstacle => obstacle.componentId && obstacle.circuitJsonMetadata?.pcb_port_id &&
    !obstacle.isCopperPour && !(obstacle as Obstacle & { isNonPlatedHole?: boolean }).isNonPlatedHole &&
    !obstacle.circuitJsonMetadata?.pcb_via_id && !obstacle.circuitJsonMetadata?.pcb_plated_hole_id);
  const candidates = [...new Set(pads.map(pad => pad.componentId!))].map(componentId => {
    const ports = new Set(pads.filter(pad => pad.componentId === componentId).map(pad => pad.circuitJsonMetadata!.pcb_port_id!));
    const sources = input.connections.map(connection => connection.pointsToConnect.flatMap((point, index) =>
      point.pcb_port_id && ports.has(point.pcb_port_id) ? [index] : []));
    return { componentId, padCount: ports.size, sources };
  }).filter(candidate => candidate.sources.some(indices => indices.length))
    .sort((a, b) => b.padCount - a.padCount || a.componentId.localeCompare(b.componentId));
  if (!candidates.length || candidates[1]?.padCount === candidates[0]!.padCount)
    throw new Error("Control routing requires one unambiguous dominant native source footprint");
  const selected = candidates[0]!;
  if (selected.sources.some(indices => indices.length > 1))
    throw new Error("Control routing requires at most one native source terminal per connection");
  const memberships = selected.sources.flatMap((indices, globalConnectionIndex) => indices.length ?
    [{ globalConnectionIndex, sourcePointIndex: indices[0]! }] : []);
  for (const member of memberships) {
    const point = input.connections[member.globalConnectionIndex]!.pointsToConnect[member.sourcePointIndex]!;
    if (!["top", "bottom"].includes(point.layer)) throw new Error("Control source terminals must occupy an actual outer layer");
  }
  return { sourceComponentId: selected.componentId, sourceComponentPadCount: selected.padCount, memberships };
}

/** Derive source membership and reuse existing physically connected copper.
 * A multipoint net can already join its CPU and display while still requiring
 * a boot branch; every original terminal remains in the final phase check. */
export function prepareControlSourceRouting(input: SimpleRouteJson, options: ControlAutorouterOptions = {}) {
  if (input.layerCount !== PHYSICAL_STACK.length || input.allowBlindAndBuriedVias === true ||
    !input.connections.length || input.connections.some(connection => connection.pointsToConnect.length < 2))
    throw new Error("Control routing requires complete native connections on four physical layers with through vias");
  if (new Set(input.connections.map(connection => connection.name)).size !== input.connections.length)
    throw new Error("Control routing requires unique native connection names");
  const nativeClone = structuredClone(input);
  const prepared = compactRoutingInput({ ...nativeClone, connections: outerSignalConnections(nativeClone, options.groundNetIds) });
  prepared.defaultObstacleMargin ??= prepared.minTraceToPadEdgeClearance ?? 0.1;
  const source = nativeSourceMembership(prepared);
  const rules = { traceWidth: prepared.minTraceWidth, clearance: prepared.defaultObstacleMargin,
    viaDiameter: prepared.min_via_pad_diameter ?? prepared.minViaPadDiameter ?? prepared.minViaDiameter ?? 0.3,
    viaHoleDiameter: prepared.min_via_hole_diameter ?? prepared.minViaHoleDiameter ?? 0.15,
    gridStep: (prepared.minTraceWidth + prepared.defaultObstacleMargin) / 2 };
  const supplied = prepared.traces?.map(trace => {
    if (!trace.connection_name) throw new Error(`Supplied control copper ${trace.pcb_trace_id} has no native connection owner`);
    return { ...trace, connection_name: trace.connection_name };
  });
  const sourceCohort = (members: SourceMembership[]) => ({ ...prepared,
    connections: members.map(member => prepared.connections[member.globalConnectionIndex]!), traces: supplied });
  const prepareFanout = (sourceInput: ReturnType<typeof sourceCohort>) => new FanoutSolver(sourceInput, {
    sourceComponentId: source.sourceComponentId,
    buses: sourceInput.connections.map(connection => ({ busId: connection.name, connectionNames: [connection.name],
      sourceComponentId: source.sourceComponentId, allowedLayers: connection.allowedLayers })),
    escapeLayers: ["top", "bottom"], allowBlindAndBuriedVias: false, ...rules,
  });
  const originalFanout = prepareFanout(sourceCohort(source.memberships));
  const boundary = originalFanout.preparedBuses[0]!.sharedBoundary;
  const components = fixedConnectionComponents(input);
  const byName = new Map(components.map(component => [component.connectionName, component]));
  const reused: SourceMembership[] = [], pending: SourceMembership[] = [];
  for (const member of source.memberships) {
    const connection = input.connections[member.globalConnectionIndex]!;
    const sourceComponent = byName.get(connection.name)?.components.find(component => component.terminalIndices.includes(member.sourcePointIndex));
    const extent = sourceComponent?.traceBounds;
    const escaped = extent && (extent.minX <= boundary.minX || extent.maxX >= boundary.maxX ||
      extent.minY <= boundary.minY || extent.maxY >= boundary.maxY);
    const complete = sourceComponent?.terminalIndices.length === connection.pointsToConnect.length;
    (escaped || complete ? reused : pending).push(member);
  }
  const sourceInput = sourceCohort(pending);
  const fanout = pending.length ? (pending.length === source.memberships.length ? originalFanout : prepareFanout(sourceInput)) : undefined;
  if (fanout) {
    if (fanout.preparedBuses.length !== pending.length) throw new Error("Control source preparation omitted native source terminals");
    for (const bus of fanout.preparedBuses) {
      const member = pending[bus.connections[0]!.connectionIndex]!;
      if (bus.connections.length !== 1 || bus.connections[0]!.sourcePointIndex !== member.sourcePointIndex)
        throw new Error("Control source preparation changed native source membership");
      const boundary = bus.sharedBoundary;
      if (boundary.minX < input.bounds.minX || boundary.maxX > input.bounds.maxX ||
        boundary.minY < input.bounds.minY || boundary.maxY > input.bounds.maxY)
        throw new Error("Control source breakout boundary exceeds native board bounds");
    }
  }
  return { prepared, sourceInput, fanout, rules, pending, reused, components,
    sourceMemberships: source.memberships, sourceBoundary: boundary,
    sourceComponentId: source.sourceComponentId, sourceComponentPadCount: source.sourceComponentPadCount };
}

function carrierComponents(input: SimpleRouteJson, preparation: ReturnType<typeof prepareControlSourceRouting>): SimpleRouteJson {
  const reports = new Map(fixedConnectionComponents(input).map(report => [report.connectionName, report]));
  const cpuCenter = { x: (preparation.sourceBoundary.minX + preparation.sourceBoundary.maxX) / 2,
    y: (preparation.sourceBoundary.minY + preparation.sourceBoundary.maxY) / 2 };
  const connections = input.connections.flatMap((connection, globalConnectionIndex) => {
    const report = reports.get(connection.name)!;
    const groups = [...report.groups, ...report.uncontactedTerminals.map(index => [index])];
    if (groups.length <= 1) return [];
    const source = preparation.sourceMemberships.find(member => member.globalConnectionIndex === globalConnectionIndex);
    const representatives = groups.map(group => {
      if (!source || !group.includes(source.sourcePointIndex)) return group[0]!;
      // The real display terminal supplies an external endpoint for the
      // remaining branch when its immutable component reaches the display.
      return group.toSorted((a, b) => {
        const first = connection.pointsToConnect[a]!, second = connection.pointsToConnect[b]!;
        return Math.hypot(second.x - cpuCenter.x, second.y - cpuCenter.y) - Math.hypot(first.x - cpuCenter.x, first.y - cpuCenter.y) || a - b;
      })[0]!;
    }).sort((a, b) => a - b);
    return [{ ...connection, pointsToConnect: representatives.map(index => connection.pointsToConnect[index]!) }];
  });
  return { ...input, connections };
}

/** Fresh native source escapes followed by immutable-copper carrier routing.
 * Only complete physical connectivity of the original connections is emitted. */
export function createControlAutorouter(input: SimpleRouteJson, options: ControlAutorouterOptions = {}): ControlRoutingAdapter {
  if (options.maxSourceMilliseconds !== undefined && (!Number.isFinite(options.maxSourceMilliseconds) || options.maxSourceMilliseconds < 0))
    throw new Error("Control source time budget must be a non-negative finite number");
  const original = JSON.stringify(input);
  const preparation = prepareControlSourceRouting(input, options);
  const { prepared, sourceInput, fanout, rules, pending } = preparation;
  const sourceParams: Parameters<typeof routeMixedSurfaceSourcePrefixesSteps>[0] = {
    srj: sourceInput, buses: fanout?.preparedBuses ?? [], ...rules, criticalSourceCorridors: true,
  };
  const work = fanout ? routeMixedSurfaceSourcePrefixesSteps(sourceParams) : undefined;
  const handlers: Record<string, ((event: AutorouterEvent) => void)[]> = {};
  const emit = (event: AutorouterEvent) => handlers[event.type]?.forEach(handler => handler(event));
  let carrier: OuterRoutingAdapter | undefined, prefixes: SimplifiedPcbTrace[] = [];
  let traces: SimplifiedPcbTrace[] | undefined, started = false;
  const sourceOutput = (computed: FanoutRoutePlan[] | null): SimpleRouteJson => {
    if (!fanout) return carrierComponents(prepared, preparation);
    if (!computed || computed.length !== pending.length || new Set(computed.map(plan => plan.connectionIndex)).size !== pending.length ||
      computed.some(plan => !pending[plan.connectionIndex] || plan.sourcePointIndex !== pending[plan.connectionIndex]!.sourcePointIndex ||
        plan.connectionName !== sourceInput.connections[plan.connectionIndex]!.name || plan.termination.type !== "boundary"))
      throw new Error("Control source escape did not complete every original native source");
    const output = buildOutputSimpleRouteJson({ inputSrj: sourceInput, plans: computed, layerNames: [...PHYSICAL_STACK] });
    const contract = validateFanoutSolution({ inputSrj: sourceInput, outputSrj: output, plans: computed,
      preparedBuses: fanout.preparedBuses, sharedBoundary: fanout.preparedBuses[0]!.sharedBoundary,
      clearance: rules.clearance, allowBlindAndBuriedVias: false });
    if (!contract.valid) throw new Error(`Control source prefixes failed their public contract: ${JSON.stringify(contract.issues)}`);
    prefixes = computed.map(plan => manufactureOuterVias(plan.trace, input));
    const local = { ...input, connections: computed.map(plan => {
      const member = pending[plan.connectionIndex]!;
      const connection = input.connections[member.globalConnectionIndex]!;
      return { ...connection, pointsToConnect: [connection.pointsToConnect[member.sourcePointIndex]!, { ...plan.exitPoint, layer: plan.targetLayer }] };
    }) };
    validateOuterRoutes(local, prefixes, options.groundNetIds);
    filterUnchangedPreloadedTraces(input, [...(input.traces ?? []), ...prefixes]);
    if (JSON.stringify(input) !== original) throw new Error("Native control input changed during source escape");
    const byName = new Map(output.connections.map(connection => [connection.name, connection]));
    const connections: Connection[] = prepared.connections.map(connection => {
      const escaped = byName.get(connection.name);
      if (!escaped) return connection;
      return { ...connection, pointsToConnect: escaped.pointsToConnect.map(point => {
        if (!("layer" in point) || typeof point.layer !== "string") throw new Error("Control handoffs require actual single-layer native terminals");
        return { ...point, layer: point.layer };
      }) };
    });
    return carrierComponents({ ...prepared, connections, traces: [...(input.traces ?? []), ...prefixes] }, preparation);
  };
  const alreadyComplete = (carrierInput: SimpleRouteJson) => {
    if (carrierInput.connections.length) return false;
    const complete = validateOuterRoutes(input, prefixes, options.groundNetIds);
    if (JSON.stringify(input) !== original) throw new Error("Native control input changed while routing");
    traces = complete;
    return true;
  };
  const checkedOutput = () => {
    if (traces) return traces;
    if (!carrier) throw new Error("Control routing did not complete");
    const carrierOutput = carrier.getOutputSimpleRouteJson();
    if (!carrierOutput) throw new Error("Control routing did not complete");
    filterUnchangedPreloadedTraces(input, carrierOutput.traces ?? []);
    traces = validateOuterRoutes(input, [...prefixes, ...carrier.getOutputSimplifiedPcbTraces()], options.groundNetIds);
    if (JSON.stringify(input) !== original) { traces = undefined; throw new Error("Native control input changed while routing"); }
    return traces;
  };
  const adapter: ControlRoutingAdapter = {
    input, get solver() { return carrier?.solver; }, isRouting: false,
    on(type, callback) { (handlers[type] ??= []).push(callback as (event: AutorouterEvent) => void); },
    stop() { this.isRouting = false; carrier?.stop(); },
    async start() {
      if (started) throw new Error("Control autorouter may only be started once");
      started = true; this.isRouting = true;
      const start = performance.now();
      try {
        let next = work?.next(), steps = 0;
        while (this.isRouting && next && !next.done) {
          const until = performance.now() + (options.timeSliceMilliseconds ?? 30);
          do {
            if (performance.now() - start >= (options.maxSourceMilliseconds ?? 180000)) throw new Error("Control source escape exceeded its time budget");
            next = work!.next(); steps++;
          } while (this.isRouting && !next.done && performance.now() < until);
          emit({ type: "progress", steps, progress: 0, phase: "controlSourcePrefixes" });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (!this.isRouting) { work?.return(null); return; }
        const carrierInput = sourceOutput(next?.value ?? []);
        if (alreadyComplete(carrierInput)) { this.isRouting = false; emit({ type: "complete", traces: traces! }); return; }
        carrier = await outerAutorouter(carrierInput, options);
        if (!this.isRouting) { carrier.stop(); return; }
        carrier.on("progress", emit);
        carrier.on("error", event => { this.isRouting = false; emit(event); });
        carrier.on("complete", () => {
          try { const complete = checkedOutput(); this.isRouting = false; emit({ type: "complete", traces: complete }); }
          catch (error) { this.isRouting = false; emit({ type: "error", error: error instanceof Error ? error : new Error(String(error)) }); }
        });
        await carrier.start();
      } catch (error) { this.isRouting = false; work?.return(null); emit({ type: "error", error: error instanceof Error ? error : new Error(String(error)) }); }
    },
    solveSync() {
      if (started) throw new Error("Control autorouter may only be started once");
      started = true;
      const start = performance.now();
      let next = work?.next();
      while (next && !next.done) {
        if (performance.now() - start >= (options.maxSourceMilliseconds ?? 180000)) {
          work!.return(null); throw new Error("Control source escape exceeded its time budget");
        }
        next = work!.next();
      }
      const carrierInput = sourceOutput(next?.value ?? []);
      if (alreadyComplete(carrierInput)) return traces!;
      carrier = createOuterAutorouter(carrierInput, options);
      carrier.solveSync();
      return checkedOutput();
    },
    getOutputSimplifiedPcbTraces() { return checkedOutput(); },
    getOutputSimpleRouteJson() { return traces ? { ...input, traces: [...(input.traces ?? []), ...traces] } : undefined; },
  };
  return adapter;
}

export async function controlAutorouter(input: SimpleRouteJson, options: ControlAutorouterOptions = {}): Promise<ControlRoutingAdapter> {
  return createControlAutorouter(input, options);
}
