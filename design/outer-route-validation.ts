import type { Obstacle, SimpleRouteJson, SimplifiedPcbTrace } from "@tscircuit/core";

export const PHYSICAL_STACK = ["top", "inner1", "inner2", "bottom"] as const;
export type OuterRoutingConnection = SimpleRouteJson["connections"][number] & { allowedLayers?: string[] };
const OUTER = new Set<string>(["top", "bottom"]);
const EPSILON = 1e-6;
type Point = { x: number; y: number };
type RoutePoint = SimplifiedPcbTrace["route"][number];
type Via = Extract<RoutePoint, { route_type: "via" }>;
type Copper = {
  a: Point; b: Point; radius: number; layers: string[]; owner: string;
  traceId: string; fixed: boolean; via?: Via; obstacle?: Obstacle;
};

/** The solver may omit a manufactured span, but may never contradict it. */
export function manufactureOuterVias(trace: SimplifiedPcbTrace, input: SimpleRouteJson, isGround = false): SimplifiedPcbTrace {
  const pad = input.min_via_pad_diameter ?? input.minViaPadDiameter ?? input.minViaDiameter ?? 0.3;
  const hole = input.min_via_hole_diameter ?? input.minViaHoleDiameter ?? 0.15;
  if (!Number.isFinite(pad) || !Number.isFinite(hole) || pad < 0.3 - EPSILON || hole < 0.15 - EPSILON || hole >= pad)
    throw new Error("Invalid four-layer via fabrication dimensions");
  return {
    ...trace,
    route: trace.route.map((point, index) => {
      if (point.route_type !== "via") return { ...point };
      let from = point.from_layer, to = point.to_layer;
      const previous = trace.route[index - 1], next = trace.route[index + 1];
      // Native plane fanout can be emitted backwards with the plane transition
      // still labelled in pad-to-plane order. Canonicalize this endpoint only.
      if (isGround && !previous && next?.route_type === "wire" && next.layer === from && !OUTER.has(to)) [from, to] = [to, from];
      if (isGround && !next && previous?.route_type === "wire" && previous.layer === to && !OUTER.has(from)) [from, to] = [to, from];
      return { ...point, from_layer: from, to_layer: to,
        layers: point.layers === undefined ? [...PHYSICAL_STACK] : [...point.layers],
        via_diameter: point.via_diameter ?? pad, via_hole_diameter: point.via_hole_diameter ?? hole };
    }),
  };
}

class Names {
  private parents = new Map<string, string>();
  has(name: string): boolean { return this.parents.has(name); }
  root(name: string): string {
    const parent = this.parents.get(name);
    if (parent === undefined) { this.parents.set(name, name); return name; }
    if (parent === name) return name;
    const root = this.root(parent); this.parents.set(name, root); return root;
  }
  join(names: (string | undefined)[]) {
    const values = names.filter((name): name is string => typeof name === "string" && name.length > 0);
    if (!values.length) return;
    const root = this.root(values[0]);
    for (const name of values.slice(1)) this.parents.set(this.root(name), root);
  }
}

function connectionNames(connection: SimpleRouteJson["connections"][number]): string[] {
  const extra = connection as typeof connection & { __netConnectionName?: string; __rootConnectionNames?: string[] };
  return [connection.name, connection.source_trace_id, connection.rootConnectionName,
    connection.netConnectionName, extra.__netConnectionName, ...(connection.mergedConnectionNames ?? []),
    ...(extra.__rootConnectionNames ?? []),
    ...connection.pointsToConnect.flatMap(point => [point.pointId, point.pcb_port_id])]
    .filter((name): name is string => !!name);
}

function ownership(input: SimpleRouteJson, traces: SimplifiedPcbTrace[]) {
  const names = new Names();
  for (const connection of input.connections) names.join(connectionNames(connection));
  for (const obstacle of input.obstacles) names.join(obstacle.connectedTo);
  // Supplied traces are authoritative native connectivity, including earlier phases.
  for (const trace of input.traces ?? []) names.join([trace.connection_name, ...(trace.connectsTo ?? [])]);
  for (const trace of traces) {
    const known = [trace.connection_name, ...(trace.connectsTo ?? [])].filter((name): name is string => !!name);
    if (!known.length) throw new Error(`Trace ${trace.pcb_trace_id} has no electrical ownership`);
    if (!(input.traces ?? []).includes(trace) && new Set(known.filter(name => names.has(name)).map(name => names.root(name))).size > 1)
      throw new Error(`Trace ${trace.pcb_trace_id} joins different native nets`);
    names.join(known);
  }
  const owner = (trace: SimplifiedPcbTrace) => names.root(trace.connection_name ?? trace.connectsTo![0]);
  return { names, owner };
}

/** Retain native pour reservations, including core's tiled representation. */
export function outerGroundOwners(input: SimpleRouteJson, extraGroundNames: string[] = []): Set<string> {
  if (input.layerCount !== 4 || input.allowBlindAndBuriedVias === true)
    throw new Error("Outer routing requires an actual four-layer board with through vias");
  const first = input.obstacles.filter(obstacle => obstacle.isCopperPour && obstacle.layers.includes("inner1"));
  const second = input.obstacles.filter(obstacle => obstacle.isCopperPour && obstacle.layers.includes("inner2"));
  const { names } = ownership(input, []);
  const owners1 = new Set(first.flatMap(obstacle => obstacle.connectedTo.map(name => names.root(name))));
  const ground = new Set(second.flatMap(obstacle => obstacle.connectedTo.map(name => names.root(name))).filter(name => owners1.has(name)));
  if (!ground.size) throw new Error("Both inner layers require native pour reservations for the same ground net");
  for (const name of extraGroundNames) ground.add(names.root(name));
  return ground;
}

/** Signal layer constraints retain the native physical stack and ground owners. */
export function outerSignalConnections(input: SimpleRouteJson, extraGroundNames: string[] = []): OuterRoutingConnection[] {
  const ground = outerGroundOwners(input, extraGroundNames);
  const { names } = ownership(input, []);
  return input.connections.map(connection => {
    if (ground.has(names.root(connection.name))) return connection;
    const allowedLayers = ((connection as OuterRoutingConnection).allowedLayers ?? ["top", "bottom"]).filter(layer => OUTER.has(layer));
    if (!allowedLayers.length) throw new Error(`Signal ${connection.name} has no permitted outer copper layer`);
    return { ...connection, allowedLayers };
  });
}

function finitePoint(point: Point): boolean { return Number.isFinite(point.x) && Number.isFinite(point.y); }
function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function pointSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
function orientation(a: Point, b: Point, c: Point): number { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
  const abC = orientation(a, b, c), abD = orientation(a, b, d), cdA = orientation(c, d, a), cdB = orientation(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}
function local(point: Point, obstacle: Obstacle): Point {
  const radians = -(obstacle.ccwRotationDegrees ?? 0) * Math.PI / 180;
  const dx = point.x - obstacle.center.x, dy = point.y - obstacle.center.y;
  return { x: dx * Math.cos(radians) - dy * Math.sin(radians), y: dx * Math.sin(radians) + dy * Math.cos(radians) };
}
function isOval(obstacle: Obstacle): boolean { return (obstacle.type as string) === "oval"; }
function isCircle(obstacle: Obstacle): boolean {
  return (obstacle as Obstacle & { shape?: string }).shape === "circle" ||
    (isOval(obstacle) && Math.abs(obstacle.width - obstacle.height) <= EPSILON);
}
function ellipsePointDistance(point: Point, width: number, height: number): number {
  const a = width / 2, b = height / 2, x = Math.abs(point.x), y = Math.abs(point.y);
  if ((x / a) ** 2 + (y / b) ** 2 <= 1) return 0;
  let low = 0, high = Math.max(a, b) * Math.hypot(x, y);
  for (let index = 0; index < 48; index++) {
    const lambda = (low + high) / 2;
    const value = (a * x / (lambda + a * a)) ** 2 + (b * y / (lambda + b * b)) ** 2;
    if (value > 1) low = lambda; else high = lambda;
  }
  return Math.hypot(x - a * a * x / (high + a * a), y - b * b * y / (high + b * b));
}
function obstacleDistance(a: Point, b: Point, obstacle: Obstacle, contact = false): number {
  if (isCircle(obstacle))
    return Math.max(0, pointSegment(obstacle.center, a, b) - Math.max(obstacle.width, obstacle.height) / 2);
  const p = local(a, obstacle), q = local(b, obstacle), w = obstacle.width / 2, h = obstacle.height / 2;
  if (isOval(obstacle)) {
    if (!contact) {
      // A capsule encloses both rounded oblong and elliptical native pads.
      const radius = Math.min(w, h), delta = Math.abs(w - h);
      const start = w >= h ? { x: -delta, y: 0 } : { x: 0, y: -delta };
      const end = w >= h ? { x: delta, y: 0 } : { x: 0, y: delta };
      return Math.max(0, segmentDistance(p, q, start, end) - radius);
    }
    // Prove contact against the ellipse contained by either native oval form.
    let low = 0, high = 1;
    const at = (t: number) => ellipsePointDistance({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) }, obstacle.width, obstacle.height);
    if (distance(p, q) <= EPSILON) return at(0);
    for (let index = 0; index < 36; index++) {
      const left = (2 * low + high) / 3, right = (low + 2 * high) / 3;
      if (at(left) < at(right)) high = right; else low = left;
    }
    return Math.min(at(0), at(1), at((low + high) / 2));
  }
  if ([p, q].some(point => Math.abs(point.x) <= w && Math.abs(point.y) <= h)) return 0;
  const corners = [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }];
  return Math.min(...corners.map((corner, index) => segmentDistance(p, q, corner, corners[(index + 1) % 4])));
}
function copperDistance(a: Copper, b: Copper, contact = false): number {
  if (a.obstacle && b.obstacle) {
    const first = a.obstacle, second = b.obstacle;
    if (isCircle(first) && isCircle(second)) return distance(first.center, second.center) - first.width / 2 - second.width / 2;
    if (isCircle(first) || isOval(first)) return obstacleDistance(first.center, first.center, second, contact) - Math.min(first.width, first.height) / 2;
    if (isCircle(second) || isOval(second)) return obstacleDistance(second.center, second.center, first, contact) - Math.min(second.width, second.height) / 2;
    const corners = (obstacle: Obstacle) => {
      const angle = (obstacle.ccwRotationDegrees ?? 0) * Math.PI / 180;
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({
        x: obstacle.center.x + x * obstacle.width / 2 * Math.cos(angle) - y * obstacle.height / 2 * Math.sin(angle),
        y: obstacle.center.y + x * obstacle.width / 2 * Math.sin(angle) + y * obstacle.height / 2 * Math.cos(angle),
      }));
    };
    const one = corners(first), two = corners(second);
    return Math.min(...one.map((point, index) => obstacleDistance(point, one[(index + 1) % 4], second, contact)),
      ...two.map((point, index) => obstacleDistance(point, two[(index + 1) % 4], first, contact)));
  }
  if (a.obstacle) return obstacleDistance(b.a, b.b, a.obstacle, contact) - b.radius;
  if (b.obstacle) return obstacleDistance(a.a, a.b, b.obstacle, contact) - a.radius;
  return segmentDistance(a.a, a.b, b.a, b.b) - a.radius - b.radius;
}
function layersOverlap(a: Copper, b: Copper): boolean { return a.layers.some(layer => b.layers.includes(layer)); }

function assertOnBoard(copper: Copper, input: SimpleRouteJson) {
  const clearance = input.minBoardEdgeClearance ?? 0;
  const radius = copper.radius + clearance;
  for (const point of [copper.a, copper.b]) {
    if (point.x - radius < input.bounds.minX - EPSILON || point.x + radius > input.bounds.maxX + EPSILON ||
      point.y - radius < input.bounds.minY - EPSILON || point.y + radius > input.bounds.maxY + EPSILON)
      throw new Error(`Trace ${copper.traceId} violates the board edge clearance`);
  }
  if (input.outline && input.outline.length >= 3) {
    for (let index = 0; index < input.outline.length; index++) {
      if (segmentDistance(copper.a, copper.b, input.outline[index], input.outline[(index + 1) % input.outline.length]) < radius - EPSILON)
        throw new Error(`Trace ${copper.traceId} violates the board outline clearance`);
    }
    for (const point of [copper.a, copper.b]) {
      let inside = false;
      for (let i = 0, j = input.outline.length - 1; i < input.outline.length; j = i++) {
        const a = input.outline[i], b = input.outline[j];
        if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      if (!inside) throw new Error(`Trace ${copper.traceId} leaves the board outline`);
    }
  }
}

function traceCopper(trace: SimplifiedPcbTrace, owner: string, fixed: boolean, input: SimpleRouteJson, isGround: boolean, names: Names): Copper[] {
  const copper: Copper[] = [];
  for (let index = 0; index < trace.route.length; index++) {
    const point = trace.route[index], previous = trace.route[index - 1], next = trace.route[index + 1];
    if (point.route_type === "wire") {
      if (!finitePoint(point) || !Number.isFinite(point.width) || point.width < input.minTraceWidth - EPSILON ||
        !PHYSICAL_STACK.includes(point.layer as typeof PHYSICAL_STACK[number]) || (!isGround && !OUTER.has(point.layer)))
        throw new Error(`Trace ${trace.pcb_trace_id} has invalid or inner-layer signal copper`);
      if (previous?.route_type === "wire" && previous.layer !== point.layer)
        throw new Error(`Trace ${trace.pcb_trace_id} changes layer without a physical handoff`);
      copper.push({ a: previous?.route_type === "wire" ? previous : point, b: point,
        radius: Math.max(point.width, previous?.route_type === "wire" ? previous.width : point.width) / 2,
        layers: [point.layer], owner, traceId: trace.pcb_trace_id, fixed });
    } else if (point.route_type === "via") {
      const layers = point.layers ?? (fixed ? [...PHYSICAL_STACK] : []);
      if (!finitePoint(point) || layers.length !== 4 || PHYSICAL_STACK.some((layer, i) => layers[i] !== layer) ||
        !PHYSICAL_STACK.includes(point.from_layer as typeof PHYSICAL_STACK[number]) || !PHYSICAL_STACK.includes(point.to_layer as typeof PHYSICAL_STACK[number]) ||
        point.from_layer === point.to_layer || (!isGround && (!OUTER.has(point.from_layer) || !OUTER.has(point.to_layer))) ||
        !Number.isFinite(point.via_diameter ?? 0.3) || (point.via_diameter ?? 0.3) < (input.min_via_pad_diameter ?? input.minViaPadDiameter ?? input.minViaDiameter ?? 0.3) - EPSILON ||
        !Number.isFinite(point.via_hole_diameter ?? 0.15) || (point.via_hole_diameter ?? 0.15) < (input.min_via_hole_diameter ?? input.minViaHoleDiameter ?? 0.15) - EPSILON ||
        (point.via_hole_diameter ?? 0.15) >= (point.via_diameter ?? 0.3))
        throw new Error(`Trace ${trace.pcb_trace_id} has an invalid manufactured through via`);
      if (!fixed) {
        if (previous?.route_type === "wire" && (previous.layer !== point.from_layer || distance(previous, point) > EPSILON))
          throw new Error(`Trace ${trace.pcb_trace_id} has a mismatched incoming via handoff`);
        if (next?.route_type === "wire" && (next.layer !== point.to_layer || distance(next, point) > EPSILON))
          throw new Error(`Trace ${trace.pcb_trace_id} has a mismatched outgoing via handoff`);
        if ((!previous || !next) && !isGround) {
          // Preloaded fanout terminals can legitimately end at a shared via.
          const shared = (input.traces ?? []).some(trace => trace.route.some(p => p.route_type === "via" && distance(p, point) <= EPSILON));
          if (!shared) throw new Error(`Trace ${trace.pcb_trace_id} terminates at an unconnected signal via`);
        }
        if ((input as SimpleRouteJson & { allowViaInPad?: boolean }).allowViaInPad !== true && input.connections.some(connection =>
          connection.pointsToConnect.some(terminal => distance(terminal, point) <= EPSILON)))
          throw new Error(`Trace ${trace.pcb_trace_id} places a new drill on a native terminal`);
      }
      copper.push({ a: point, b: point, radius: (point.via_diameter ?? 0.3) / 2, layers: [...layers], owner,
        traceId: trace.pcb_trace_id, fixed, via: point });
    } else if (point.route_type === "through_obstacle") {
      const metadata = point.circuitJsonMetadata;
      const obstacle = input.obstacles.find(obstacle => metadata && obstacle.circuitJsonMetadata &&
        ["pcb_plated_hole_id", "pcb_smtpad_id", "pcb_via_id", "pcb_port_id"].some(key =>
          (metadata as Record<string, unknown>)[key] !== undefined && (metadata as Record<string, unknown>)[key] === (obstacle.circuitJsonMetadata as Record<string, unknown>)[key]));
      if (!obstacle || obstacle.isNonPlatedHole || !finitePoint(point.start) || !finitePoint(point.end) ||
        !obstacle.connectedTo.some(name => names.root(name) === owner) ||
        !Number.isFinite(point.width) || point.width < input.minTraceWidth - EPSILON ||
        !obstacle.layers.includes(point.from_layer) || !obstacle.layers.includes(point.to_layer) ||
        obstacleDistance(point.start, point.start, obstacle, true) > EPSILON || obstacleDistance(point.end, point.end, obstacle, true) > EPSILON ||
        (!isGround && (!OUTER.has(point.from_layer) || !OUTER.has(point.to_layer))))
        throw new Error(`Trace ${trace.pcb_trace_id} uses an unverified plated-pad handoff`);
      copper.push({ a: point.start, b: point.end, radius: point.width / 2, layers: [...obstacle.layers],
        owner, traceId: trace.pcb_trace_id, fixed, obstacle });
    } else throw new Error(`Trace ${trace.pcb_trace_id} contains an unsupported jumper`);
  }
  return copper;
}

function signature(trace: SimplifiedPcbTrace, id = trace.pcb_trace_id): string {
  const { __replaces_pcb_trace_id: _replacement, ...value } = trace;
  const sorted = (object: unknown): unknown => Array.isArray(object) ? object.map(sorted) :
    object && typeof object === "object" ? Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, sorted(value)])) : object;
  return JSON.stringify(sorted({ ...value, pcb_trace_id: id }));
}

/** Exact repeats are harmless; changes to supplied routes or ownership are not. */
export function filterUnchangedPreloadedTraces(input: SimpleRouteJson, returned: SimplifiedPcbTrace[]): SimplifiedPcbTrace[] {
  const fixed = new Map<string, SimplifiedPcbTrace>();
  for (const trace of input.traces ?? []) {
    if (fixed.has(trace.pcb_trace_id)) throw new Error(`Duplicate supplied trace ID ${trace.pcb_trace_id}`);
    fixed.set(trace.pcb_trace_id, trace);
  }
  const seen = new Set<string>();
  const output: SimplifiedPcbTrace[] = [];
  for (const trace of returned) {
    const id = trace.__replaces_pcb_trace_id ?? trace.pcb_trace_id;
    const original = fixed.get(id);
    if (trace.__replaces_pcb_trace_id && !original) throw new Error(`Unknown supplied trace replacement ${id}`);
    if (original) {
      if (signature(trace, original.pcb_trace_id) !== signature(original))
        throw new Error(`Autorouter changed supplied trace ${id}`);
      continue;
    }
    if (seen.has(trace.pcb_trace_id)) throw new Error(`Duplicate routed trace ID ${trace.pcb_trace_id}`);
    seen.add(trace.pcb_trace_id); output.push(trace);
  }
  return output;
}

/** Validate physical output and every native terminal, rather than a solver's flag. */
export function validateOuterRoutes(input: SimpleRouteJson, returned: SimplifiedPcbTrace[], extraGroundNames: string[] = []): SimplifiedPcbTrace[] {
  const ground = outerGroundOwners(input, extraGroundNames);
  const rawNewTraces = filterUnchangedPreloadedTraces(input, returned);
  const rawOwnership = ownership(input, rawNewTraces);
  const rawGround = new Set([...ground].map(name => rawOwnership.names.root(name)));
  const newTraces = rawNewTraces.map(trace => manufactureOuterVias(trace, input, rawGround.has(rawOwnership.owner(trace))));
  const allTraces = [...(input.traces ?? []), ...newTraces];
  const { names, owner } = ownership(input, allTraces);
  const groundRoots = new Set([...ground].map(name => names.root(name)));
  const copper = allTraces.flatMap(trace => traceCopper(trace, owner(trace), (input.traces ?? []).includes(trace), input, groundRoots.has(owner(trace)), names));
  const additions = copper.filter(piece => !piece.fixed);
  const margin = input.defaultObstacleMargin ?? 0.1;
  for (const piece of additions) {
    assertOnBoard(piece, input);
    for (const obstacle of input.obstacles) {
      if (piece.via && (obstacle.isNonPlatedHole || obstacle.circuitJsonMetadata?.pcb_plated_hole_id || obstacle.circuitJsonMetadata?.pcb_via_id)) {
        const details = obstacle as Obstacle & { holeDiameter?: number; hole_diameter?: number };
        const diameter = details.holeDiameter ?? details.hole_diameter;
        const sharedNativeVia = !!obstacle.circuitJsonMetadata?.pcb_via_id && obstacle.connectedTo.some(name => names.root(name) === piece.owner) && distance(piece.a, obstacle.center) <= EPSILON &&
          Math.abs(obstacle.width - piece.radius * 2) <= EPSILON && Math.abs(obstacle.height - piece.radius * 2) <= EPSILON;
        // SRJ omits many native PTH drill diameters. A minimum via drill cannot
        // stand in for a larger connector hole: reserve its full native shape.
        const gap = diameter === undefined ? obstacleDistance(piece.a, piece.a, obstacle) : distance(piece.a, obstacle.center) - diameter / 2;
        if (!sharedNativeVia && gap < (piece.via.via_hole_diameter ?? 0.15) / 2 +
          Math.max(input.minViaHoleEdgeToViaHoleEdgeClearance ?? margin, input.minPlatedHoleDrillEdgeToDrillEdgeClearance ?? margin) - EPSILON)
          throw new Error(`Trace ${piece.traceId} collides with a native drill`);
      }
      if (!piece.layers.some(layer => obstacle.layers.includes(layer)) || obstacle.connectedTo.some(name => names.root(name) === piece.owner)) continue;
      // Full-stack drills get antipads in the inner pours; wires may not enter them.
      if (obstacle.isCopperPour && (piece.via || piece.obstacle?.circuitJsonMetadata?.pcb_plated_hole_id || piece.obstacle?.circuitJsonMetadata?.pcb_via_id)) continue;
      const clearance = piece.via ? (input.minViaEdgeToPadEdgeClearance ?? margin) :
        obstacle.isNonPlatedHole ? (input.minTraceToHoleEdgeClearance ?? margin) : (input.minTraceToPadEdgeClearance ?? margin);
      if (obstacleDistance(piece.a, piece.b, obstacle) - piece.radius < clearance - EPSILON)
        throw new Error(`Trace ${piece.traceId} collides with native obstacle ${obstacle.obstacleId ?? obstacle.circuitJsonMetadata?.pcb_smtpad_id ?? "keepout"}`);
    }
  }
  for (let i = 0; i < copper.length; i++) for (let j = i + 1; j < copper.length; j++) {
    const a = copper[i], b = copper[j];
    if (a.fixed && b.fixed) continue;
    if (a.via && b.via) {
      const coincidentSameBarrel = a.owner === b.owner && distance(a.a, b.a) <= EPSILON &&
        Math.abs((a.via.via_hole_diameter ?? 0.15) - (b.via.via_hole_diameter ?? 0.15)) <= EPSILON &&
        Math.abs(a.radius - b.radius) <= EPSILON;
      if (!coincidentSameBarrel && distance(a.a, b.a) < (a.via.via_hole_diameter ?? 0.15) / 2 +
        (b.via.via_hole_diameter ?? 0.15) / 2 + Math.max(input.minViaHoleEdgeToViaHoleEdgeClearance ?? margin,
          input.minPlatedHoleDrillEdgeToDrillEdgeClearance ?? margin) - EPSILON)
        throw new Error(`Via drill collision between ${a.traceId} and ${b.traceId}`);
    }
    if (a.owner !== b.owner && layersOverlap(a, b) && copperDistance(a, b) < margin - EPSILON)
      throw new Error(`Copper collision between ${a.traceId} and ${b.traceId}`);
  }
  // Native pads and planes can connect separate branches of the same net.
  const conductiveObstacles: Copper[] = input.obstacles.filter(obstacle => obstacle.connectedTo.length > 0 && !obstacle.isNonPlatedHole).map(obstacle => ({
    a: obstacle.center, b: obstacle.center, radius: 0, layers: obstacle.layers,
    owner: names.root(obstacle.connectedTo[0]), traceId: obstacle.obstacleId ?? "native-pad", fixed: true, obstacle,
  }));
  const graph = [...copper, ...conductiveObstacles];
  const parents = graph.map((_, index) => index);
  const root = (index: number): number => { while (parents[index] !== index) { parents[index] = parents[parents[index]]; index = parents[index]; } return index; };
  for (let i = 0; i < graph.length; i++) for (let j = i + 1; j < graph.length; j++) {
    const a = graph[i], b = graph[j];
    if (a.owner === b.owner && layersOverlap(a, b) && copperDistance(a, b, true) <= EPSILON) parents[root(j)] = root(i);
  }
  for (const connection of input.connections) {
    if (connection.pointsToConnect.length < 2) continue;
    const electricalOwner = names.root(connection.name);
    let component: number | undefined;
    for (const terminal of connection.pointsToConnect) {
      const multi = terminal as unknown as { layers?: string[] };
      const layers = multi.layers ?? [terminal.layer];
      const contact = graph.findIndex(piece => piece.owner === electricalOwner && piece.layers.some(layer => layers.includes(layer)) &&
        (piece.obstacle ? obstacleDistance(terminal, terminal, piece.obstacle, true) <= EPSILON : pointSegment(terminal, piece.a, piece.b) <= piece.radius + EPSILON));
      if (contact < 0) throw new Error(`Connection ${connection.name} has an unrouted native terminal`);
      if (component !== undefined && root(contact) !== component) throw new Error(`Connection ${connection.name} is only partially routed`);
      component = root(contact);
    }
  }
  return newTraces;
}
