import { getSimpleRouteJsonFromCircuitJson, type Obstacle, type SimpleRouteJson, type SimplifiedPcbTrace } from "@tscircuit/core";
import type { AnyCircuitElement } from "circuit-json";
import { nativeElectricalOwnership } from "../scripts/native-electrical-ownership";

export interface NativeFixedCopperHydrationProof {
  nativeTraceCount: number;
  addedTraceCount: number;
  preservedPreloadCount: number;
  removedTraceProxyCount: number;
  addedNativeViaObstacleCount: number;
  nativeInlineViaCount: number;
  shapeRefinements: { nativeId: string; nativeShape: string; primitiveCount: number }[];
  requiresFinalNativeAudit: true;
}

const EPSILON = 1e-8;
const stableId = (id: string) => /^(source_(?:trace|net|port)_|pcb_(?:trace|via|port|smtpad|plated_hole)_)/.test(id);
const sameNumber = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= EPSILON;
const sameLayers = (a: readonly string[], b: readonly string[]) => a.length === b.length &&
  new Set(a).size === a.length && new Set(b).size === b.length && a.every(layer => b.includes(layer));
const metadataId = (obstacle: Obstacle) => obstacle.circuitJsonMetadata?.pcb_smtpad_id ??
  obstacle.circuitJsonMetadata?.pcb_plated_hole_id ?? obstacle.circuitJsonMetadata?.pcb_via_id;
const traceSource = (trace: SimplifiedPcbTrace) => (trace as SimplifiedPcbTrace & { source_trace_id?: string }).source_trace_id;
const geometryMatchesObstacle = (a: Obstacle, b: Obstacle) => sameNumber(a.center.x, b.center.x) && sameNumber(a.center.y, b.center.y) &&
  sameNumber(a.width, b.width) && sameNumber(a.height, b.height) && sameNumber(a.ccwRotationDegrees ?? 0, b.ccwRotationDegrees ?? 0) && sameLayers(a.layers, b.layers);

/** Replace only authenticated core trace bounds with the exact native copper
 * they represent. Existing phase data and preload objects remain untouched.
 * The caller must provide the native snapshot from this same routing event. */
export function hydrateNativeFixedCopper(phaseInput: SimpleRouteJson, nativeCircuitJson: AnyCircuitElement[]): {
  input: SimpleRouteJson; proof: NativeFixedCopperHydrationProof;
} {
  const inputBytes = JSON.stringify(phaseInput), nativeBytes = JSON.stringify(nativeCircuitJson);
  const converted = getSimpleRouteJsonFromCircuitJson({ circuitJson: nativeCircuitJson }).simpleRouteJson;
  const withoutTrace = getSimpleRouteJsonFromCircuitJson({
    circuitJson: nativeCircuitJson.filter(element => element.type !== "pcb_trace"),
  }).simpleRouteJson;
  if (converted.layerCount !== phaseInput.layerCount ||
      !Object.entries(phaseInput.bounds).every(([key, value]) => sameNumber(value, converted.bounds[key as keyof typeof converted.bounds])))
    throw new Error("Native snapshot has stale board bounds or physical layers");
  const stack = phaseInput.layerCount === 2 ? ["top", "bottom"] :
    ["top", ...Array.from({ length: phaseInput.layerCount - 2 }, (_, index) => `inner${index + 1}`), "bottom"];
  const ownership = nativeElectricalOwnership(nativeCircuitJson);
  const nativeTraces = nativeCircuitJson.filter(element => element.type === "pcb_trace");
  const nativeById = new Map(nativeTraces.map(trace => [trace.pcb_trace_id, trace]));
  if (nativeById.size !== nativeTraces.length) throw new Error("Duplicate native trace identity");
  const vias = nativeCircuitJson.filter(element => element.type === "pcb_via");
  if (new Set(vias.map(via => via.pcb_via_id)).size !== vias.length) throw new Error("Duplicate native barrel identity");
  const phaseIds = new Set<string>();
  const phaseOwners = new Map<string, string>();
  const register = (ids: readonly (string | undefined)[]) => {
    for (const id of ids) {
      if (!id || !stableId(id)) continue;
      phaseIds.add(id);
      const owner = ownership.getNetConnectedToId(id);
      if (owner) phaseOwners.set(id, owner);
    }
  };
  for (const obstacle of phaseInput.obstacles) register(obstacle.connectedTo);
  for (const connection of phaseInput.connections) register([connection.name, connection.source_trace_id,
    connection.rootConnectionName, connection.netConnectionName, ...connection.mergedConnectionNames ?? [],
    ...connection.pointsToConnect.flatMap(point => [point.pcb_port_id, point.pointId])]);
  for (const trace of phaseInput.traces ?? []) register([trace.connection_name, traceSource(trace), ...trace.connectsTo ?? []]);
  const checkOwner = (ids: readonly (string | undefined)[], expectedId: string) => {
    const expected = ownership.getNetConnectedToId(expectedId);
    const owners = new Set(ids.flatMap(id => id && stableId(id) && phaseOwners.has(id) ? [phaseOwners.get(id)!] : []));
    if (!expected || !owners.size || [...owners].some(owner => owner !== expected))
      throw new Error(`Native snapshot has a stale or foreign owner for ${expectedId}`);
  };
  // Stable source identifiers, rather than conversion-specific connectivity_net
  // numbering, authenticate each original native pad and plated-hole anchor.
  const nativeObstacles = new Map(withoutTrace.obstacles.flatMap(obstacle => {
    const id = metadataId(obstacle); return id ? [[id, obstacle] as const] : [];
  }));
  const shapeRefinements: NativeFixedCopperHydrationProof["shapeRefinements"] = [];
  const replaceShapes = new Map<Obstacle, Obstacle[]>();
  const nativeElements = new Map(nativeCircuitJson.flatMap(element => {
    const id = element.type === "pcb_smtpad" ? element.pcb_smtpad_id : element.type === "pcb_plated_hole" ? element.pcb_plated_hole_id : undefined;
    return id ? [[id, element] as const] : [];
  }));
  const exactShape = (obstacle: Obstacle, shape: string): Obstacle[] => {
    if (shape === "circle") return [{ ...obstacle, shape: "circle" }];
    if (shape !== "pill" && shape !== "rotated_pill") return [obstacle];
    const radius = Math.min(obstacle.width, obstacle.height) / 2;
    const dx = Math.max(0, (obstacle.width - obstacle.height) / 2), dy = Math.max(0, (obstacle.height - obstacle.width) / 2);
    if (!dx && !dy) return [{ ...obstacle, shape: "circle" }];
    const rotation = (obstacle.ccwRotationDegrees ?? 0) * Math.PI / 180;
    const metadata = obstacle.circuitJsonMetadata;
    const capMetadata = metadata?.pcb_port_id ? { pcb_port_id: metadata.pcb_port_id, source_port_name: metadata.source_port_name } : undefined;
    const caps = [-1, 1].map(sign => ({ ...obstacle, shape: "circle" as const, width: radius * 2, height: radius * 2,
      center: { x: obstacle.center.x + sign * (dx * Math.cos(rotation) - dy * Math.sin(rotation)),
        y: obstacle.center.y + sign * (dx * Math.sin(rotation) + dy * Math.cos(rotation)) },
      circuitJsonMetadata: capMetadata }));
    return [{ ...obstacle, shape: undefined, width: dx ? dx * 2 : obstacle.width, height: dy ? dy * 2 : obstacle.height }, ...caps];
  };
  const suppliedNativeIds = new Set<string>();
  for (const obstacle of phaseInput.obstacles) {
    const id = metadataId(obstacle);
    if (!id) continue;
    if (suppliedNativeIds.has(id)) throw new Error(`Duplicate native obstacle identity ${id}`);
    suppliedNativeIds.add(id);
    const actual = nativeObstacles.get(id);
    const element = nativeElements.get(id);
    const shape = element && "shape" in element ? element.shape : undefined;
    const primitives = actual && typeof shape === "string" ? exactShape(actual, shape) : actual ? [actual] : [];
    const originalEnvelope = actual && geometryMatchesObstacle(obstacle, actual);
    const alreadyRefined = primitives.length > 1 && geometryMatchesObstacle(obstacle, primitives[0]!) && primitives.slice(1).every(cap =>
      phaseInput.obstacles.some(candidate => candidate.shape === "circle" && geometryMatchesObstacle(candidate, cap) &&
        candidate.connectedTo.length === obstacle.connectedTo.length && candidate.connectedTo.every(id => obstacle.connectedTo.includes(id))));
    if (!actual || !originalEnvelope && !alreadyRefined) throw new Error(`Native snapshot has stale obstacle geometry ${id}`);
    if (element && (obstacle.shape && obstacle.shape !== "circle" || obstacle.shape === "circle" && shape !== "circle" && !alreadyRefined && shape !== "pill" && shape !== "rotated_pill"))
      throw new Error(`Native obstacle has a foreign physical shape ${id}`);
    checkOwner(obstacle.connectedTo, id);
    if (originalEnvelope && typeof shape === "string" && (shape === "circle" || shape === "pill" || shape === "rotated_pill") &&
        !(shape === "circle" && obstacle.shape === "circle")) {
      const refined = exactShape(obstacle, shape);
      replaceShapes.set(obstacle, refined);
      shapeRefinements.push({ nativeId: id, nativeShape: shape, primitiveCount: refined.length });
    }
  }
  for (const connection of phaseInput.connections) for (const point of connection.pointsToConnect) {
    const id = point.pcb_port_id ?? point.pointId;
    if (!id?.startsWith("pcb_port_")) continue;
    const port = nativeCircuitJson.find(element => element.type === "pcb_port" && element.pcb_port_id === id);
    if (!port || port.type !== "pcb_port" || !sameNumber(point.x, port.x) || !sameNumber(point.y, port.y) || !(port.layers as string[]).includes(point.layer))
      throw new Error(`Native snapshot has stale terminal geometry ${id}`);
    checkOwner([connection.name, connection.source_trace_id, ...connection.mergedConnectionNames ?? [], id], id);
  }
  const publicTraces = converted.traces ?? [];
  if (publicTraces.length !== nativeTraces.length) throw new Error("Public conversion omitted native fixed copper");
  let nativeInlineViaCount = 0;
  const fixed = publicTraces.map(trace => {
    const native = nativeById.get(trace.pcb_trace_id);
    if (!native || !native.source_trace_id || trace.connection_name !== native.source_trace_id || trace.route.length !== native.route.length)
      throw new Error(`Public conversion changed native trace identity ${trace.pcb_trace_id}`);
    checkOwner([native.source_trace_id, ...trace.connectsTo ?? []], native.source_trace_id);
    if (!phaseIds.has(native.source_trace_id) && !phaseInput.obstacles.some(obstacle =>
      obstacle.connectedTo.some(id => ownership.areIdsConnected(id, native.source_trace_id!))))
      throw new Error(`Native trace is absent from this phase snapshot ${native.pcb_trace_id}`);
    return { ...trace, route: trace.route.map((point, index) => {
      const original = native.route[index]!;
      if (point.route_type !== original.route_type || !sameNumber(point.x, original.x) || !sameNumber(point.y, original.y))
        throw new Error("Public conversion changed native route geometry");
      if (point.route_type === "wire") {
        if (original.route_type !== "wire" || point.width !== original.width || point.layer !== original.layer)
          throw new Error("Public conversion changed native wire geometry");
        return point;
      }
      if (point.route_type !== "via" || original.route_type !== "via") throw new Error("Unsupported native copper primitive");
      const matches = vias.filter(via => sameNumber(via.x, point.x) && sameNumber(via.y, point.y) &&
        (via.layers as string[]).includes(point.from_layer) && (via.layers as string[]).includes(point.to_layer) &&
        ownership.areIdsConnected(via.pcb_via_id, native.source_trace_id!));
      if (matches.length !== 1) throw new Error(`Native inline via lacks one authenticated barrel ${trace.pcb_trace_id}:${index}`);
      const via = matches[0]!;
      if (!sameLayers(via.layers, stack) || !(via.outer_diameter > via.hole_diameter && via.hole_diameter > 0))
        throw new Error("Native inline barrel has an invalid full physical span or drill");
      nativeInlineViaCount++;
      return { ...point, layers: [...via.layers], via_diameter: via.outer_diameter, via_hole_diameter: via.hole_diameter };
    }) };
  });
  const geometryMatches = (a: SimplifiedPcbTrace, b: SimplifiedPcbTrace) => a.route.length === b.route.length && a.route.every((point, index) => {
    const other = b.route[index]!;
    if (!("x" in point) || !("x" in other)) return false;
    if (point.route_type !== other.route_type || !sameNumber(point.x, other.x) || !sameNumber(point.y, other.y)) return false;
    if (point.route_type === "wire") return other.route_type === "wire" && point.width === other.width && point.layer === other.layer;
    return point.route_type === "via" && other.route_type === "via" && point.from_layer === other.from_layer && point.to_layer === other.to_layer &&
      (point.layers === undefined || sameLayers(point.layers, other.layers!)) &&
      (point.via_diameter === undefined || point.via_diameter === other.via_diameter) &&
      (point.via_hole_diameter === undefined || point.via_hole_diameter === other.via_hole_diameter);
  });
  const represented = new Set<string>(), preloadIds = new Set<string>();
  for (const preload of phaseInput.traces ?? []) {
    if (preloadIds.has(preload.pcb_trace_id)) throw new Error("Duplicate preloaded trace identity");
    preloadIds.add(preload.pcb_trace_id);
    const exactIdentity = fixed.find(trace => trace.pcb_trace_id === preload.pcb_trace_id);
    const matches = exactIdentity ? [exactIdentity] : fixed.filter(trace => geometryMatches(preload, trace));
    if (!matches.length) continue; // A previously routed phase is preserved verbatim.
    if (matches.length !== 1 || !geometryMatches(preload, matches[0]!)) throw new Error("Stale or ambiguous native preload geometry");
    const match = matches[0]!;
    checkOwner([preload.connection_name, traceSource(preload), ...preload.connectsTo ?? []], match.connection_name!);
    if (represented.has(match.pcb_trace_id)) throw new Error("Duplicate preload represents the same native copper");
    represented.add(match.pcb_trace_id);
  }
  const proxyKey = (obstacle: Obstacle) => JSON.stringify([obstacle.type, [...obstacle.layers].sort(),
    obstacle.center.x.toFixed(10), obstacle.center.y.toFixed(10), obstacle.width.toFixed(10), obstacle.height.toFixed(10)]);
  const sourceIds = new Set(fixed.map(trace => trace.connection_name!));
  const proxies = new Map<string, Obstacle[]>();
  for (const obstacle of phaseInput.obstacles) {
    if (obstacle.circuitJsonMetadata || obstacle.isCopperPour || obstacle.isNonPlatedHole || obstacle.shape || obstacle.type !== "rect") continue;
    const source = obstacle.connectedTo.find(id => sourceIds.has(id));
    if (!source) continue;
    checkOwner(obstacle.connectedTo, source);
    (proxies.get(source) ?? (proxies.set(source, []), proxies.get(source)!)).push(obstacle);
  }
  const expected = new Map<string, Obstacle[]>();
  for (const trace of publicTraces) {
    const bounds: Obstacle[] = [];
    for (const [index, point] of trace.route.entries()) {
      if (point.route_type !== "wire" && point.route_type !== "via") throw new Error("Unsupported native copper primitive");
      if (point.route_type === "via") {
        const from = stack.indexOf(point.from_layer), to = stack.indexOf(point.to_layer);
        const diameter = point.via_diameter ?? phaseInput.minViaPadDiameter ?? phaseInput.minViaDiameter ?? 0.6;
        bounds.push({ type: "rect", center: { x: point.x, y: point.y }, width: diameter, height: diameter,
          layers: stack.slice(Math.min(from, to), Math.max(from, to) + 1), connectedTo: [] });
      }
      const next = trace.route[index + 1];
      if (!next || next.route_type !== "wire" && next.route_type !== "via") continue;
      const width = point.route_type === "wire" ? point.width : next.route_type === "wire" ? next.width : phaseInput.minTraceWidth;
      const layer = point.route_type === "wire" ? point.layer : point.to_layer;
      const dx = next.x - point.x, dy = next.y - point.y;
      const steps = dx === 0 || dy === 0 ? 1 : Math.max(1, Math.ceil(Math.hypot(dx, dy) / width));
      for (let step = 0; step < steps; step++) {
        const x1 = point.x + dx * step / steps, y1 = point.y + dy * step / steps;
        const x2 = point.x + dx * (step + 1) / steps, y2 = point.y + dy * (step + 1) / steps;
        bounds.push({ type: "rect", center: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
          width: Math.abs(x2 - x1) + width, height: Math.abs(y2 - y1) + width, layers: [layer], connectedTo: [] });
      }
    }
    (expected.get(trace.connection_name!) ?? (expected.set(trace.connection_name!, []), expected.get(trace.connection_name!)!)).push(...bounds);
  }
  const remove = new Set<Obstacle>();
  for (const [source, bounds] of expected) {
    const supplied = proxies.get(source) ?? [];
    if (!supplied.length && fixed.filter(trace => trace.connection_name === source).every(trace => represented.has(trace.pcb_trace_id))) continue;
    const counts = new Map<string, number>();
    for (const bound of bounds) counts.set(proxyKey(bound), (counts.get(proxyKey(bound)) ?? 0) + 1);
    for (const obstacle of supplied) {
      const key = proxyKey(obstacle), count = counts.get(key) ?? 0;
      if (!count) throw new Error(`Native fixed-copper proxy has stale geometry ${source}`);
      counts.set(key, count - 1); remove.add(obstacle);
    }
    if ([...counts.values()].some(count => count !== 0)) throw new Error(`Native fixed-copper proxy is missing or stale ${source}`);
  }
  const addedViaObstacles: Obstacle[] = [];
  for (const via of vias) {
    if (suppliedNativeIds.has(via.pcb_via_id)) continue;
    const actual = nativeObstacles.get(via.pcb_via_id);
    const trace = via.pcb_trace_id ? nativeById.get(via.pcb_trace_id) : undefined;
    const ownerId = trace?.source_trace_id ?? via.source_net_id;
    if (!actual || !ownerId || !sameLayers(via.layers, stack)) throw new Error(`Missing authenticated native barrel ownership ${via.pcb_via_id}`);
    checkOwner([ownerId], via.pcb_via_id);
    addedViaObstacles.push({ ...actual, connectedTo: [via.pcb_via_id, ownerId, ...via.pcb_port_ids ?? []] });
  }
  const addedTraces = fixed.filter(trace => !represented.has(trace.pcb_trace_id));
  if (JSON.stringify(phaseInput) !== inputBytes || JSON.stringify(nativeCircuitJson) !== nativeBytes)
    throw new Error("Native conversion mutated its input snapshot");
  return {
    input: { ...phaseInput, obstacles: [...phaseInput.obstacles.filter(obstacle => !remove.has(obstacle)).flatMap(obstacle => replaceShapes.get(obstacle) ?? [obstacle]), ...addedViaObstacles],
      traces: [...phaseInput.traces ?? [], ...addedTraces] },
    proof: { nativeTraceCount: fixed.length, addedTraceCount: addedTraces.length, preservedPreloadCount: phaseInput.traces?.length ?? 0,
      removedTraceProxyCount: remove.size, addedNativeViaObstacleCount: addedViaObstacles.length, nativeInlineViaCount, shapeRefinements,
      requiresFinalNativeAudit: true },
  };
}
