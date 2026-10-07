import { checkPcbTraceSelfShorts } from "@tscircuit/checks";
import { validateRoutedCopperDrc } from "@tscircuit/fanout-solver";
import type { SimpleRouteJson, Trace, Via, Wire } from "./vendor/bus-lanes-outer.js";

export interface DdrPhysicalAuditOptions {
  /** Original board capture, used for exact native via and plated-hole drills. */
  nativeCircuitJson?: readonly unknown[];
}
export interface DdrPhysicalIssue {
  code: string;
  message: string;
  traceId?: string;
  otherTraceId?: string;
  connectionName?: string;
  obstacleId?: string;
  layer?: string;
  actualMm?: number;
  requiredMm?: number;
}
type Point = {x: number; y: number};
type RecordValue = Record<string, unknown>;
type NativeObstacle = SimpleRouteJson["obstacles"][number] & {
  circuitJsonMetadata?: RecordValue;
  obstacleId?: string;
};
interface Drill {
  id: string;
  kind: "via" | "plated";
  a: Point;
  b: Point;
  radius: number;
  layers: string[];
  candidate: boolean;
  exact: boolean;
  traceId?: string;
}
const span = ["top","inner1","inner2","bottom"];
const eps = 1e-7;
const outer = (layer: string) => layer === "top" || layer === "bottom";
const finitePositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === "object";
const distance = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
const coincident = (a: Point,b: Point) => distance(a,b) <= eps;
const fingerprint = (value: unknown) => {
  // Browser-safe provenance fingerprint, not a cryptographic integrity claim.
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0),16777619);
  return (hash >>> 0).toString(16).padStart(8,"0");
};
function pointSegmentDistance(point: Point,a: Point,b: Point) {
  const dx = b.x-a.x,dy = b.y-a.y,squared = dx*dx+dy*dy;
  const t = squared ? Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/squared)) : 0;
  return distance(point,{x:a.x+t*dx,y:a.y+t*dy});
}
function segmentDistance(a: Point,b: Point,c: Point,d: Point) {
  const cross = (p: Point,q: Point,r: Point) => (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const ac = cross(a,b,c),ad = cross(a,b,d),ca = cross(c,d,a),cb = cross(c,d,b);
  if (ac*ad < 0 && ca*cb < 0) return 0;
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
function turnsAreConventional(trace: Trace) {
  let previous: Wire | undefined,direction: Point | undefined;
  for (const point of trace.route) {
    if (point.route_type !== "wire") { previous = direction = undefined; continue; }
    if (!previous || previous.layer !== point.layer) { previous = point; direction = undefined; continue; }
    const length = distance(previous,point);
    if (length < 1e-8) continue;
    const next = {x:(point.x-previous.x)/length,y:(point.y-previous.y)/length};
    // Smooth sampled curves are allowed; absolute directions need not be multiples of 45 degrees.
    if (direction && direction.x*next.x+direction.y*next.y < Math.cos(45.2*Math.PI/180)) return false;
    previous = point; direction = next;
  }
  return true;
}
function nativeDrill(element: RecordValue,obstacle: NativeObstacle): Drill | undefined {
  const x = element.x,y = element.y;
  if (typeof x !== "number" || typeof y !== "number" || ![x,y].every(Number.isFinite)) return;
  const layers = Array.isArray(element.layers) && element.layers.every(layer => typeof layer === "string") ? element.layers as string[] : obstacle.layers;
  const rotation = Number(element.ccw_rotation ?? obstacle.ccwRotationDegrees ?? 0)*Math.PI/180;
  const rotate = (px: number,py: number): Point => ({x:x+px*Math.cos(rotation)-py*Math.sin(rotation),y:y+px*Math.sin(rotation)+py*Math.cos(rotation)});
  const ox = Number(element.hole_offset_x ?? 0),oy = Number(element.hole_offset_y ?? 0);
  if (![rotation,ox,oy].every(Number.isFinite)) return;
  const id = String(element.pcb_via_id ?? element.pcb_plated_hole_id);
  const kind = element.type === "pcb_via" ? "via" : "plated";
  if (finitePositive(element.hole_diameter)) {
    const center = rotate(ox,oy);
    return {id,kind,a:center,b:center,radius:element.hole_diameter/2,layers,candidate:false,exact:true};
  }
  if (element.shape === "pill" && finitePositive(element.hole_width) && finitePositive(element.hole_height)) {
    const width = element.hole_width,height = element.hole_height,radius = Math.min(width,height)/2;
    const dx = Math.max(0,(width-height)/2),dy = Math.max(0,(height-width)/2);
    return {id,kind,a:rotate(ox-dx,oy-dy),b:rotate(ox+dx,oy+dy),radius,layers,candidate:false,exact:true};
  }
}

/** Independent acceptance against original board copper. This does not route,
 * modify native copper, replace timing/coupling gates, or certify plane/SI signoff. */
export function auditDdrPhysicalGeometry(input: SimpleRouteJson,traces: Trace[],options: DdrPhysicalAuditOptions = {}) {
  const inputFingerprint = fingerprint(input),candidateFingerprint = fingerprint(traces);
  const supplied = input.traces ?? [],fixedFingerprint = fingerprint(supplied);
  const issues: DdrPhysicalIssue[] = [],fixedBaselineIssues: DdrPhysicalIssue[] = [];
  const expectedNames = new Set(input.connections.map(connection => connection.name));
  const candidateIds = new Set(traces.map(trace => trace.pcb_trace_id));
  const clearance = input.minTraceToPadEdgeClearance ?? input.defaultObstacleMargin;
  const viaDrillClearance = input.minViaHoleEdgeToViaHoleEdgeClearance ?? 0;
  const platedDrillClearance = Number((input as SimpleRouteJson & {minPlatedHoleDrillEdgeToDrillEdgeClearance?: number}).minPlatedHoleDrillEdgeToDrillEdgeClearance ?? viaDrillClearance);
  const diameter = input.minViaPadDiameter ?? 0.3,hole = input.minViaHoleDiameter ?? 0.15;
  const boardClearance = input.minBoardEdgeClearance ?? 0;
  if (input.layerCount !== 4 || !Number.isFinite(clearance) || clearance! < 0 ||
      !Number.isFinite(viaDrillClearance) || viaDrillClearance < 0 || !Number.isFinite(platedDrillClearance) || platedDrillClearance < 0 ||
      !finitePositive(diameter) || !finitePositive(hole) || hole >= diameter || !Number.isFinite(boardClearance) || boardClearance < 0 ||
      !Object.values(input.bounds).every(Number.isFinite) || input.bounds.minX >= input.bounds.maxX || input.bounds.minY >= input.bounds.maxY)
    issues.push({code:"invalid-native-rules",message:"Native four-layer copper, drill and board-edge rules must be finite and physically valid"});
  if (candidateIds.size !== traces.length || supplied.some(trace => candidateIds.has(trace.pcb_trace_id)))
    issues.push({code:"duplicate-trace-id",message:"Candidate trace IDs must be unique and distinct from supplied copper"});
  for (const connection of input.connections) {
    const matches = traces.filter(trace => trace.connection_name === connection.name);
    if (matches.length !== 1) issues.push({code:"missing-or-duplicate-route",connectionName:connection.name,message:`Expected one complete native route for ${connection.name}, got ${matches.length}`});
  }
  for (const trace of traces) {
    const connection = input.connections.find(connection => connection.name === trace.connection_name);
    if (!connection || !expectedNames.has(trace.connection_name!)) { issues.push({code:"unknown-candidate-owner",traceId:trace.pcb_trace_id,message:"Candidate does not identify an original native connection"}); continue; }
    const width = input.buses?.find(bus => bus.connectionNames.includes(connection.name))?.traceWidth ?? connection.nominalTraceWidth ?? connection.width ?? input.minTraceWidth;
    const route = trace.route;
    const matchesPad = (point: Wire | Via | undefined,pad: typeof connection.pointsToConnect[number]) => point?.route_type === "wire" && point.layer === pad.layer && coincident(point,pad);
    const pads = connection.pointsToConnect;
    if (route.length < 2 || pads.length !== 2 ||
        !((matchesPad(route[0],pads[0]) && matchesPad(route.at(-1),pads[1])) || (matchesPad(route[0],pads[1]) && matchesPad(route.at(-1),pads[0]))))
      issues.push({code:"native-endpoint-mismatch",traceId:trace.pcb_trace_id,message:"Route does not join both original native pad coordinates and layers"});
    for (let index = 0; index < route.length; index++) {
      const point = route[index],previous = route[index-1];
      if (![point.x,point.y].every(Number.isFinite)) issues.push({code:"nonfinite-coordinate",traceId:trace.pcb_trace_id,message:"Candidate contains a nonfinite coordinate"});
      if (point.route_type === "wire") {
        if (!outer(point.layer) || !finitePositive(point.width) || point.width !== width)
          issues.push({code:"invalid-outer-wire",traceId:trace.pcb_trace_id,message:"Every signal wire must use TOP/BOTTOM and its exact native positive width"});
      } else if (point.route_type === "via") {
        if (!outer(point.from_layer) || !outer(point.to_layer) || point.from_layer === point.to_layer ||
            JSON.stringify(point.layers) !== JSON.stringify(span) || point.via_diameter !== diameter || point.via_hole_diameter !== hole)
          issues.push({code:"invalid-manufactured-via",traceId:trace.pcb_trace_id,message:"Candidate via requires native land/drill sizes and an explicit full four-layer span"});
      } else issues.push({code:"unsupported-route-point",traceId:trace.pcb_trace_id,message:"Candidate contains an unsupported route primitive"});
      if (!previous) continue;
      if ((previous.route_type === "wire" && point.route_type === "wire" && previous.layer !== point.layer) ||
          (previous.route_type === "wire" && point.route_type === "via" && (!coincident(previous,point) || previous.layer !== point.from_layer)) ||
          (previous.route_type === "via" && point.route_type === "wire" && (!coincident(previous,point) || previous.to_layer !== point.layer)) ||
          (previous.route_type === "via" && point.route_type === "via"))
        issues.push({code:"disconnected-handoff",traceId:trace.pcb_trace_id,message:"Every wire/via handoff must be coincident and preserve the actual layer transition"});
    }
    if (!turnsAreConventional(trace)) issues.push({code:"nonconventional-turn",traceId:trace.pcb_trace_id,message:"Joined ordinary or sampled-curve copper turns by more than 45.2 degrees"});
    for (const point of route) {
      const radius = point.route_type === "via" ? diameter/2 : point.route_type === "wire" ? point.width/2 : 0;
      if (point.x-radius < input.bounds.minX+boardClearance-eps || point.x+radius > input.bounds.maxX-boardClearance+eps ||
          point.y-radius < input.bounds.minY+boardClearance-eps || point.y+radius > input.bounds.maxY-boardClearance+eps)
        issues.push({code:"board-edge-clearance",traceId:trace.pcb_trace_id,message:"Candidate copper violates the original board bounds and edge clearance"});
    }
  }
  if (input.outline?.length) {
    const outline = coincident(input.outline[0],input.outline.at(-1)!) ? input.outline.slice(0,-1) : input.outline;
    const isRectangle = outline.length === 4 && new Set(outline.map(point => `${point.x}:${point.y}`)).size === 4 &&
      outline.every((point,index) => {
        const next = outline[(index+1)%outline.length];
        return (point.x === input.bounds.minX || point.x === input.bounds.maxX) &&
          (point.y === input.bounds.minY || point.y === input.bounds.maxY) && (point.x === next.x || point.y === next.y);
      });
    if (!isRectangle) issues.push({code:"unsupported-board-outline",message:"A nonrectangular native outline requires an independent polygon board-edge audit"});
  }

  // Only identities present in original fixed records are added. Empty endpoint
  // lists deliberately avoid inventing a power endpoint at an existing via.
  const fixed = supplied.map(trace => ({...trace,connection_name:trace.connection_name ?? trace.source_trace_id}));
  const fixedOwners = [...new Set(fixed.flatMap(trace => trace.connection_name ? [trace.connection_name] : []))];
  const auditInput = {...input,connections:[...input.connections,...fixedOwners.filter(name => !expectedNames.has(name)).map(name => ({name,pointsToConnect:[]}))],traces:fixed};
  let nativeDrc: ReturnType<typeof validateRoutedCopperDrc> | undefined;
  try {
    const params = (routes: Trace[]) => ({inputSrj:auditInput,routedSrj:{...auditInput,traces:routes},clearance:clearance!,allowBlindAndBuriedVias:false}) as Parameters<typeof validateRoutedCopperDrc>[0];
    const baseline = validateRoutedCopperDrc(params(fixed));
    fixedBaselineIssues.push(...baseline.issues);
    nativeDrc = validateRoutedCopperDrc(params([...fixed,...traces]));
    issues.push(...nativeDrc.issues.filter(issue => candidateIds.has(issue.traceId) || (issue.otherTraceId !== undefined && candidateIds.has(issue.otherTraceId))));
  } catch (error) { issues.push({code:"native-validator-error",message:`Native DRC did not complete: ${String(error)}`}); }

  const drills: Drill[] = [],fixedDrillKeys = new Set<string>();
  const addFixed = (drill: Drill) => {
    const key = [drill.a.x,drill.a.y,drill.b.x,drill.b.y,drill.radius].map(value => value.toFixed(7)).join(":")+":"+[...drill.layers].sort().join(",");
    if (!fixedDrillKeys.has(key)) { drills.push(drill); fixedDrillKeys.add(key); }
  };
  for (const trace of fixed) for (const [index,point] of trace.route.entries()) if (point.route_type === "via")
    addFixed({id:`${trace.pcb_trace_id}:via:${index}`,kind:"via",a:point,b:point,radius:(point.via_hole_diameter ?? hole)/2,layers:point.layers ?? span,candidate:false,exact:true,traceId:trace.pcb_trace_id});
  const capture = new Map<string,RecordValue>();
  for (const element of options.nativeCircuitJson ?? []) if (record(element)) {
    const id = element.type === "pcb_via" ? element.pcb_via_id : element.type === "pcb_plated_hole" ? element.pcb_plated_hole_id : undefined;
    if (typeof id === "string") capture.set(id,element);
  }
  let assumedNativeViaDrillCount = 0,conservativePlatedDrillCount = 0,nativeViaObstacleCount = 0;
  const capturedObstacleIds = new Set<string>();
  for (const obstacle of input.obstacles as NativeObstacle[]) {
    const viaId = obstacle.circuitJsonMetadata?.pcb_via_id,platedId = obstacle.circuitJsonMetadata?.pcb_plated_hole_id;
    const id = typeof viaId === "string" ? viaId : typeof platedId === "string" ? platedId : undefined;
    if (!id) continue;
    capturedObstacleIds.add(id);
    if (typeof viaId === "string") nativeViaObstacleCount++;
    const actual = capture.get(id),exact = actual ? nativeDrill(actual,obstacle) : undefined;
    const sameLayers = exact && exact.layers.length === obstacle.layers.length && exact.layers.every(layer => obstacle.layers.includes(layer));
    const sameViaLand = typeof viaId !== "string" || (finitePositive(actual?.outer_diameter) &&
      Math.abs(actual.outer_diameter-obstacle.width) <= eps && Math.abs(actual.outer_diameter-obstacle.height) <= eps &&
      finitePositive(actual.hole_diameter) && actual.hole_diameter < actual.outer_diameter);
    if (options.nativeCircuitJson && (!exact || !sameLayers || !sameViaLand || !coincident({x:Number(actual?.x),y:Number(actual?.y)},obstacle.center))) {
      fixedBaselineIssues.push({code:"native-drill-capture-mismatch",obstacleId:id,message:"Original native barrel metadata is missing, invalid, or disagrees with its SRJ obstacle"});
      continue;
    }
    if (exact) addFixed(exact);
    else if (typeof viaId === "string") {
      assumedNativeViaDrillCount++;
      addFixed({id,kind:"via",a:obstacle.center,b:obstacle.center,radius:hole/2,layers:obstacle.layers,candidate:false,exact:true});
    } else {
      // With no exact hole capture, the complete enclosing copper rectangle is
      // a conservative bound. This can reject a candidate; it cannot hide one.
      conservativePlatedDrillCount++;
      addFixed({id,kind:"plated",a:obstacle.center,b:obstacle.center,radius:Math.hypot(obstacle.width,obstacle.height)/2,layers:obstacle.layers,candidate:false,exact:false});
    }
  }
  if (options.nativeCircuitJson) for (const id of capture.keys()) if (!capturedObstacleIds.has(id))
    fixedBaselineIssues.push({code:"native-drill-omitted",obstacleId:id,message:"Original native drilled copper is absent from the supplied obstacle field"});
  const suppliedDrillCount = drills.length;
  for (const trace of traces) for (const [index,point] of trace.route.entries()) if (point.route_type === "via")
    drills.push({id:`${trace.pcb_trace_id}:via:${index}`,kind:"via",a:point,b:point,radius:(point.via_hole_diameter ?? hole)/2,layers:point.layers ?? span,candidate:true,exact:true,traceId:trace.pcb_trace_id});
  for (let i = 0; i < drills.length; i++) for (let j = i+1; j < drills.length; j++) {
    const a = drills[i],b = drills[j];
    if (!a.layers.some(layer => b.layers.includes(layer)) || (!a.candidate && !b.candidate && (!a.exact || !b.exact))) continue;
    const actualMm = segmentDistance(a.a,a.b,b.a,b.b)-a.radius-b.radius;
    const drillClearance = a.kind === "plated" || b.kind === "plated" ? platedDrillClearance : viaDrillClearance;
    if (actualMm >= drillClearance-eps) continue;
    const issue = {code:"drill-clearance",traceId:a.traceId,otherTraceId:b.traceId,obstacleId:!a.candidate?a.id:!b.candidate?b.id:undefined,
      message:`Drills ${a.id} and ${b.id} violate the original drill-edge clearance`,actualMm,requiredMm:drillClearance};
    (a.candidate || b.candidate ? issues : fixedBaselineIssues).push(issue);
  }
  try {
    const normalized = traces.map(trace => ({...trace,source_trace_id:trace.source_trace_id ?? trace.connection_name,
      route:trace.route.map(point => point.route_type === "via" ? {...point,outer_diameter:point.via_diameter,hole_diameter:point.via_hole_diameter} : point)}));
    const materialized = traces.flatMap(trace => trace.route.flatMap((point,index) => point.route_type === "via" ? [{
      type:"pcb_via",pcb_via_id:`physical_audit_${trace.pcb_trace_id}_${index}`,pcb_trace_id:trace.pcb_trace_id,
      source_trace_id:trace.source_trace_id ?? trace.connection_name,x:point.x,y:point.y,
      outer_diameter:point.via_diameter,hole_diameter:point.via_hole_diameter,layers:point.layers,
    }] : []));
    // The library only evaluates traces named by a length-matched source bus.
    // This harness activates its physical self-contact check for every candidate,
    // including RESET, without changing original timing/routing constraints.
    const selfInput = [{type:"pcb_board",pcb_board_id:"physical_audit_board",num_layers:input.layerCount},
      {type:"source_bus",source_bus_id:"physical_audit_candidates",source_trace_ids:normalized.map(trace => trace.source_trace_id),max_length_skew:0},
      ...normalized,...materialized] as Parameters<typeof checkPcbTraceSelfShorts>[0];
    issues.push(...checkPcbTraceSelfShorts(selfInput).map(issue => ({code:"self-short",traceId:issue.pcb_trace_id,message:issue.message})));
  } catch (error) { issues.push({code:"self-validator-error",message:`Physical self-contact audit did not complete: ${String(error)}`}); }
  if (fingerprint(input) !== inputFingerprint || fingerprint(traces) !== candidateFingerprint)
    issues.push({code:"audit-input-mutated",message:"Physical validation changed its original input or candidate geometry"});
  return {
    pass:issues.length === 0 && fixedBaselineIssues.length === 0,issues,fixedBaselineIssues,
    counts:{expectedSignalRoutes:input.connections.length,candidateRoutes:traces.length,suppliedTraces:supplied.length,obstacles:input.obstacles.length,
      nativeViaObstacles:nativeViaObstacleCount,suppliedDrills:suppliedDrillCount,candidateDrills:drills.length-suppliedDrillCount,
      checkedNativeSegments:nativeDrc?.checkedSegmentCount ?? 0},
    provenance:{scope:"Original native pads, supplied copper and manufactured DDR candidates",fingerprintAlgorithm:"fnv1a32-json (non-cryptographic)",
      nativeInputFingerprint:inputFingerprint,suppliedCopperFingerprint:fixedFingerprint,candidateFingerprint,
      nativeCircuitJsonFingerprint:options.nativeCircuitJson ? fingerprint(options.nativeCircuitJson) : undefined,
      validator:"@tscircuit/fanout-solver:validateRoutedCopperDrc",selfValidator:"@tscircuit/checks:checkPcbTraceSelfShorts",
      clearanceMm:clearance,drillClearanceMm:viaDrillClearance,platedDrillClearanceMm:platedDrillClearance,boardEdgeClearanceMm:boardClearance,
      assumedNativeViaDrillCount,conservativePlatedDrillCount},
    notVerified:["Timing and physical differential coupling (separate DDR gates)","Plane connectivity, stackup, impedance and signal integrity",
      ...(conservativePlatedDrillCount ? ["Fixed-to-fixed plated-hole drills without exact native capture; candidate checks use conservative enclosing bounds"] : [])],
  };
}
