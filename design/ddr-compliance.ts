import type { Connection, SimpleRouteJson, Trace, Wire } from "./vendor/bus-lanes-outer.js";
import { DDR_RULES, ddrTimingGroups, ddrPairs, ddrTraceName } from "./ddr-rules";
import { sharedNets } from "./ddr-netlist";

export type SignalNames = Record<string, string>;
/** Core exports bus members in the declared connections order. Used only by
 * the router adapter; the independent board audit resolves actual source nets.
 */
export function signalNamesFromDeclaredBuses(input: SimpleRouteJson): SignalNames {
  const names: SignalNames = {};
  for (const group of ddrTimingGroups) {
    const bus = input.buses?.find(b => b.busId === group.name || b.name === group.name);
    if (!bus || bus.connectionNames.length !== group.signals.length)
      throw new Error(`Missing or incomplete timing bus: ${group.name}`);
    bus.connectionNames.forEach((name, i) => {
      if (names[name]) throw new Error(`Signal occurs in more than one DDR timing group: ${name}`);
      names[name] = group.signals[i];
    });
  }
  const remaining = input.connections.filter(c => !names[c.name]);
  if (remaining.length !== 1) throw new Error("Expected only RESET# outside clocked DDR timing groups");
  names[remaining[0].name] = "DDR_RESETn_SIGNAL";
  assertDdrConstraints(input, names);
  return names;
}
export function assertDdrConstraints(input: SimpleRouteJson, names: SignalNames) {
  const problems: string[] = [];
  const connectionBySignal = new Map(input.connections.map(c => [names[c.name], c.name]));
  const expectedSignals = sharedNets.map(ddrTraceName);
  if (input.connections.length !== expectedSignals.length ||
      new Set(input.connections.map(c => c.name)).size !== expectedSignals.length ||
      expectedSignals.some(n => !connectionBySignal.has(n)))
    problems.push("DDR input must contain every one of the 47 CPU-to-RAM signals exactly once");
  if (input.layerCount !== 4 || input.allowedLayers?.length !== 2 ||
      !DDR_RULES.signalLayers.every(layer => input.allowedLayers!.includes(layer)))
    problems.push("Missing outer-layer restriction: DDR input");
  for (const group of ddrTimingGroups) {
    const actual = input.buses?.find(b => b.name === group.name || b.busId === group.name);
    const expected = group.signals.map(s => connectionBySignal.get(s)).sort();
    if (!actual || JSON.stringify([...actual.connectionNames].sort()) !== JSON.stringify(expected) ||
        actual.maxLengthSkew === undefined || !Number.isFinite(actual.maxLengthSkew) || actual.maxLengthSkew < 0 || actual.maxLengthSkew > group.maxLengthSkew)
      problems.push(`Missing, incomplete or relaxed timing bus: ${group.name}`);
    if (!actual?.allowedLayers?.length || actual.allowedLayers.some(l => !DDR_RULES.signalLayers.includes(l as any)))
      problems.push(`Missing outer-layer restriction: ${group.name}`);
  }
  for (const pair of ddrPairs) {
    const members = pair.signals.map(s => connectionBySignal.get(s));
    const actual = input.differentialPairs?.find(p => p.connectionNames.length === 2 && p.connectionNames[0] === members[0] && p.connectionNames[1] === members[1]);
    if (!actual || !Number.isFinite(actual.lengthTolerance) || actual.lengthTolerance < 0 || actual.lengthTolerance > DDR_RULES.pairSkewMm)
      problems.push(`Missing or relaxed differential pair: ${pair.name}`);
  }
  if (problems.length) throw new Error(problems.join("; "));
}

const geometryToleranceMm = 1e-7;
const fullViaSpan = ["top", "inner1", "inner2", "bottom"];
const isOuterLayer = (layer: string) => layer === "top" || layer === "bottom";
const coincident = (a: {x: number; y: number}, b: {x: number; y: number}) =>
  [a.x,a.y,b.x,b.y].every(Number.isFinite) && Math.hypot(a.x-b.x,a.y-b.y) <= geometryToleranceMm;
const signalWidth = (input: SimpleRouteJson, connection: Connection) =>
  input.buses?.find(bus => bus.connectionNames.includes(connection.name))?.traceWidth ??
  connection.nominalTraceWidth ?? connection.width ?? input.minTraceWidth;

/** Recover the actual plane carrying a pair's shared corridor. Owned TOP
 * approaches may contain additional transitions, so the whole joined route
 * must not be described as a single-plane carrier. Coupling itself is checked
 * independently by the adapter against physical exterior copper. */
function pairedCarrierLayer(trace: Trace | undefined): string | undefined {
  if (!trace || !Array.isArray(trace.route)) return;
  const vias = trace.route.flatMap((point, index) => point.route_type === "via" ? [index] : []);
  const start = vias.length ? vias[0]+1 : 0;
  const end = vias.length ? vias[1]-1 : trace.route.length-1;
  if (vias.length === 1 || start >= end) return;
  const section = trace.coupledSection ?? [start,end];
  if (section.length !== 2 || !section.every(Number.isInteger) ||
      section[0] < start || section[1] > end || section[0] >= section[1]) return;
  const corridor = trace.route.slice(section[0],section[1]+1);
  if (!corridor.length || corridor.some(point => point.route_type !== "wire")) return;
  const wires = corridor as Wire[], layer = wires[0].layer;
  if (!isOuterLayer(layer) || wires.some(point => point.layer !== layer) ||
      !wires.slice(1).some((point,index) => !coincident(point,wires[index]))) return;
  return layer;
}

/** Pad-to-pad copper lengths include surface escapes. Through-via delays are
 * not guessed: stackup, package flight times, impedance and SI remain separate gates.
 */
export function auditDdrGeometry(input: SimpleRouteJson, traces: Trace[], names: SignalNames) {
  const failures: string[] = [];
  try { assertDdrConstraints(input, names); } catch (e) { failures.push(String(e)); }
  const eps = geometryToleranceMm;
  const measurements = input.connections.map(c => {
    const failureCountBefore = failures.length;
    const matches = traces.filter(t => (t.connection_name ?? t.source_trace_id) === c.name);
    const trace = matches[0];
    if (matches.length !== 1) failures.push(`${names[c.name]}: expected one complete route, got ${matches.length}`);
    const route = Array.isArray(trace?.route) ? trace.route : [];
    const expectedWidth = signalWidth(input,c), diameter = input.minViaPadDiameter ?? 0.3,
      hole = input.minViaHoleDiameter ?? 0.15;
    if (!Number.isFinite(expectedWidth) || expectedWidth <= 0)
      failures.push(`${names[c.name]}: invalid native signal width`);
    if (![diameter,hole].every(Number.isFinite) || hole <= 0 || diameter <= hole)
      failures.push(`${names[c.name]}: invalid native manufactured via dimensions`);
    let lengthMm = 0;
    for (let i = 0; i < route.length; i++) {
      const point = route[i];
      if (![point.x,point.y].every(Number.isFinite)) failures.push(`${names[c.name]}: nonfinite route coordinate`);
      if (point.route_type === "wire") {
        if (!isOuterLayer(point.layer)) failures.push(`${names[c.name]}: signal wire is not on TOP or BOTTOM`);
        if (!Number.isFinite(point.width) || point.width <= 0 || point.width !== expectedWidth)
          failures.push(`${names[c.name]}: wire width does not match native signal width`);
      } else if (point.route_type === "via") {
        if (!isOuterLayer(point.from_layer) || !isOuterLayer(point.to_layer) || point.from_layer === point.to_layer ||
            JSON.stringify(point.layers) !== JSON.stringify(fullViaSpan) ||
            !Number.isFinite(point.via_diameter) || !Number.isFinite(point.via_hole_diameter) ||
            point.via_diameter !== diameter || point.via_hole_diameter !== hole)
          failures.push(`${names[c.name]}: via must have the native dimensions and explicit full four-layer span`);
      } else failures.push(`${names[c.name]}: unsupported route primitive`);
      if (!i) continue;
      const previous = route[i-1];
      if (previous.route_type === "wire" && point.route_type === "wire") {
        if (previous.layer !== point.layer) failures.push(`${names[c.name]}: layer change without a via`);
        else lengthMm += Math.hypot(previous.x-point.x,previous.y-point.y);
      } else if (previous.route_type === "wire" && point.route_type === "via") {
        if (!coincident(previous,point) || previous.layer !== point.from_layer)
          failures.push(`${names[c.name]}: discontinuous wire-to-via handoff`);
      } else if (previous.route_type === "via" && point.route_type === "wire") {
        if (!coincident(previous,point) || previous.to_layer !== point.layer)
          failures.push(`${names[c.name]}: discontinuous via-to-wire handoff`);
      } else failures.push(`${names[c.name]}: consecutive vias or unsupported handoff`);
    }
    const first = route[0], last = route.at(-1), pads = c.pointsToConnect;
    const matchesPad = (point: typeof first | undefined, pad: typeof pads[number]) =>
      point?.route_type === "wire" && point.layer === pad.layer && coincident(point,pad);
    if (route.length < 2 || pads.length !== 2 ||
        !((matchesPad(first,pads[0]) && matchesPad(last,pads[1])) ||
          (matchesPad(first,pads[1]) && matchesPad(last,pads[0]))))
      failures.push(`${names[c.name]}: route endpoints do not match native pad coordinates and layers`);
    const viaCount = route.filter(point => point.route_type === "via").length;
    if (viaCount % 2 !== 0) failures.push(`${names[c.name]}: outer route has an odd number of transitions`);
    const wireLayers = [...new Set(route.flatMap(point => point.route_type === "wire" ? [point.layer] : []))];
    const innerLayers = wireLayers.filter(layer => !isOuterLayer(layer));
    const carrierLayer = pairedCarrierLayer(trace);
    if (trace?.coupledSection && !carrierLayer) failures.push(`${names[c.name]}: invalid physical coupled carrier section`);
    const [a,b] = pads;
    const padManhattanMm = a && b ? Math.abs(a.x-b.x)+Math.abs(a.y-b.y) : NaN;
    return {name:names[c.name], connectionName:c.name, lengthMm, padManhattanMm,
      viaCount, wireLayers, innerLayers, carrierLayer, routePass:failures.length===failureCountBefore};
  });
  const groups = ddrTimingGroups.map(group => {
    const members = group.signals.map(s => measurements.find(m => m.name === s)!);
    if (members.some(m => !m)) { failures.push(`${group.name}: missing members`); return {name:group.name,pass:false}; }
    const lengths = members.map(m => m.lengthMm), min = Math.min(...lengths), max = Math.max(...lengths);
    const isCA = group.name === "DDR_ADDR_CTRL_CK";
    // Table 7-69 footnotes 4/5 define DQLM from DQ[x] (DQ+DM),
    // not the associated DQS clock class. Apply that ceiling to DQS too
    // as a conservative project requirement.
    const nominalMembers = isCA ? members : members.filter(m => !/^DDR_DQSn?/.test(m.name));
    const manhattan = Math.max(...nominalMembers.map(m => m.padManhattanMm));
    const nominalMm = manhattan + (isCA ? DDR_RULES.caManhattanAllowanceMm : 0);
    const minimumMm = isCA ? nominalMm-DDR_RULES.caNominalToleranceMm : 0;
    const maximumMm = isCA ? Math.min(nominalMm+DDR_RULES.caNominalToleranceMm,DDR_RULES.caMaximumLengthMm) : nominalMm;
    const skewMm = max-min;
    const skewPass = skewMm <= group.maxLengthSkew+eps;
    const absoluteLengthPass = min >= minimumMm-eps && max <= maximumMm+eps;
    const routingPass = members.every(m => m.routePass);
    if (!skewPass) failures.push(`${group.name}: ${skewMm.toFixed(4)} mm skew exceeds ${group.maxLengthSkew} mm`);
    if (!absoluteLengthPass) failures.push(`${group.name}: lengths ${min.toFixed(4)}–${max.toFixed(4)} mm outside ${minimumMm.toFixed(4)}–${maximumMm.toFixed(4)} mm`);
    return {name:group.name,memberCount:members.length,minLengthMm:min,maxLengthMm:max,skewMm,maxSkewMm:group.maxLengthSkew,nominalMm,minimumMm,maximumMm,skewPass,absoluteLengthPass,routingPass,pass:routingPass&&skewPass&&absoluteLengthPass};
  });
  const pairs = ddrPairs.map(pair => {
    const members = pair.signals.map(s => measurements.find(m => m.name === s)!);
    const skewMm = members.every(Boolean) ? Math.abs(members[0].lengthMm-members[1].lengthMm) : Infinity;
    const sameLayer = members.every(Boolean) && members[0].carrierLayer !== undefined &&
      members[0].carrierLayer === members[1].carrierLayer;
    const pass = members.every(m => m?.routePass) && skewMm<=DDR_RULES.pairSkewMm+eps && sameLayer;
    if (!pass) failures.push(`${pair.name}: pair skew or carrier-layer check failed`);
    return {name:pair.name,skewMm,sameLayer,pass};
  });
  return {pass:failures.length===0,failures,groups,pairs,measurements,
    notVerified:["Fabricator stackup and controlled impedance", "Reference-plane continuity and return-current stitching", "Spacing/coupling geometry and native copper DRC", "Package/via flight times and unterminated CA/CK signal integrity"],
    fabricationReady:false};
}
