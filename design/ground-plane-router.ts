import type { AutorouterEvent, GenericLocalAutorouter, SimpleRouteJson, SimplifiedPcbTrace } from "@tscircuit/core";
import { PHYSICAL_STACK, outerGroundOwners } from "./outer-route-validation";

export type GroundPlaneRoutingAdapter = GenericLocalAutorouter & {
  /** Pours are emitted after routing; only the final native polygon audit proves completion. */
  readonly requiresPostRenderGroundPlaneAudit: true;
  readonly groundPointCount: number;
  getOutputSimplifiedPcbTraces(): SimplifiedPcbTrace[];
  getOutputSimpleRouteJson(): SimpleRouteJson | undefined;
};

const EPSILON = 1e-6;

/** Defer a ground-only phase to its authored copper pours without creating
 * duplicate barrels or invoking a component fanout for connector PTHs.
 * This emits no routing witness: final emitted-pour connectivity is mandatory. */
export function createGroundPlaneAutorouter(input: SimpleRouteJson): GroundPlaneRoutingAdapter {
  if (outerGroundOwners(input).size !== 1) throw new Error("Both inner planes must reserve one ground owner");
  const original = JSON.stringify(input);
  const first = input.obstacles.filter(obstacle => obstacle.isCopperPour && obstacle.layers.includes("inner1"));
  const second = input.obstacles.filter(obstacle => obstacle.isCopperPour && obstacle.layers.includes("inner2"));
  const firstNames = new Set(first.flatMap(obstacle => obstacle.connectedTo));
  const planeNames = new Set(second.flatMap(obstacle => obstacle.connectedTo).filter(name => firstNames.has(name)));
  const sharesGround = (ids: readonly (string | undefined)[]) => ids.some(id => id !== undefined && planeNames.has(id));
  if ([...first, ...second].some(obstacle => !sharesGround(obstacle.connectedTo)))
    throw new Error("Inner plane reservations contain a foreign owner");
  const validSpan = (layers: readonly string[] | undefined) => layers?.length === PHYSICAL_STACK.length && PHYSICAL_STACK.every(layer => layers.includes(layer));
  let groundPointCount = 0;
  for (const connection of input.connections) {
    if (!sharesGround([connection.name, connection.source_trace_id, connection.rootConnectionName, connection.netConnectionName,
      ...connection.mergedConnectionNames ?? []])) throw new Error(`Ground plane phase contains non-ground connection ${connection.name}`);
    for (const point of connection.pointsToConnect) {
      const layers = (point as typeof point & { layers?: string[] }).layers ?? [point.layer];
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !layers.length || layers.some(layer => !PHYSICAL_STACK.includes(layer as typeof PHYSICAL_STACK[number])))
        throw new Error(`Ground connection ${connection.name} has an invalid physical terminal`);
      const anchor = input.obstacles.find(obstacle => {
        const metadata = obstacle.circuitJsonMetadata;
        if (!metadata || !(metadata.pcb_smtpad_id || metadata.pcb_plated_hole_id || metadata.pcb_via_id) ||
          !sharesGround(obstacle.connectedTo) || !layers.some(layer => obstacle.layers.includes(layer)) ||
          Math.hypot(point.x - obstacle.center.x, point.y - obstacle.center.y) > EPSILON) return false;
        // Via ports have no pad metadata; exact native barrel geometry anchors them.
        return !!metadata.pcb_via_id || metadata.pcb_port_id === point.pcb_port_id || metadata.pcb_port_id === point.pointId;
      });
      if (!anchor) throw new Error(`Ground connection ${connection.name} has an unanchored native terminal`);
      groundPointCount++;
    }
  }
  for (const obstacle of input.obstacles) {
    if ((obstacle.circuitJsonMetadata?.pcb_via_id || obstacle.circuitJsonMetadata?.pcb_plated_hole_id) && !validSpan(obstacle.layers))
      throw new Error("Ground plane routing requires full-stack native barrels");
  }
  for (const trace of input.traces ?? []) for (const point of trace.route) {
    if (point.route_type === "via" && !validSpan(point.layers)) throw new Error("Ground plane routing requires full-stack preloaded vias");
    if (point.route_type === "wire" && !PHYSICAL_STACK.includes(point.layer as typeof PHYSICAL_STACK[number]))
      throw new Error("Preloaded copper uses an unknown physical layer");
    if (point.route_type === "wire" && (point.layer === "inner1" || point.layer === "inner2") &&
      !sharesGround([trace.connection_name, ...trace.connectsTo ?? []])) throw new Error("Inner planes contain preloaded non-ground wire copper");
  }
  const handlers: Record<string, ((event: AutorouterEvent) => void)[]> = {};
  let started = false;
  let completed = false;
  const checkedOutput = (): SimplifiedPcbTrace[] => {
    if (JSON.stringify(input) !== original) throw new Error("Native ground input changed during deferred plane routing");
    return [];
  };
  const begin = () => {
    if (started) throw new Error("Ground plane autorouter may only be started once");
    started = true;
  };
  return {
    input, isRouting: false, requiresPostRenderGroundPlaneAudit: true, groundPointCount,
    on(type, callback) { (handlers[type] ??= []).push(callback as (event: AutorouterEvent) => void); },
    stop() { this.isRouting = false; },
    async start() {
      try {
        begin(); this.isRouting = true;
        const traces = checkedOutput(); completed = true; this.isRouting = false;
        for (const handler of handlers.complete ?? []) handler({ type: "complete", traces });
      } catch (error) {
        this.isRouting = false;
        for (const handler of handlers.error ?? []) handler({ type: "error", error: error instanceof Error ? error : new Error(String(error)) });
      }
    },
    solveSync() { begin(); const traces = checkedOutput(); completed = true; return traces; },
    getOutputSimplifiedPcbTraces() {
      if (!completed) throw new Error("Deferred ground routing has not completed");
      return checkedOutput();
    },
    getOutputSimpleRouteJson() {
      if (!completed) return undefined;
      checkedOutput();
      return { ...input, traces: [...input.traces ?? []] };
    },
  };
}

export async function groundPlaneAutorouter(input: SimpleRouteJson): Promise<GroundPlaneRoutingAdapter> {
  return createGroundPlaneAutorouter(input);
}
