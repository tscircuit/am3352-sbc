import { circlePolygon, copperPolygonsTouch, getPlatedHolePolygon, getSmtPadPolygon } from "@tscircuit/circuit-json-util";
import { exteriorPairSpacingReports, type SimpleRouteJson, type Trace } from "./vendor/bus-lanes-outer.js";

const fullSpan = ["top", "inner1", "inner2", "bottom"];
const eps = 1e-7;
const outer = (layer: unknown) => layer === "top" || layer === "bottom";
const samePoint = (a: any, b: any) => !!a && !!b && [a.x, a.y, b.x, b.y].every(Number.isFinite) && Math.hypot(a.x - b.x, a.y - b.y) <= eps;
const pairRules = [
  ...[0, 1].flatMap(index => ["CPU", "PORT"].map(segment => ({ name: `USB${index}_${segment}`, signals: [`USB${index}_DP_${segment}`, `USB${index}_DM_${segment}`], skew: .15, gap: .1 }))),
  ...["CK", "D0", "D1", "D2"].flatMap(channel => ["TX", "PORT"].map(segment => ({ name: `TMDS_${channel}_${segment}`, signals: [`TMDS_${channel}_P_${segment}`, `TMDS_${channel}_N_${segment}`], skew: .127, gap: .18 }))),
];

/** Rebuild the twelve original pairs from native source names and pad ports.
 * Routing connection order, cached routes and coupledSection annotations do
 * not establish membership or physical exterior coupling. */
export function nativePeripheralGeometryInput(json: readonly Record<string, any>[]) {
  const boards = json.filter(element => element.type === "pcb_board");
  if (boards.length !== 1 || boards[0].num_layers !== 4 || boards[0].allow_blind_and_buried_vias !== false)
    throw new Error("Peripheral signals require one physical four-layer board without blind or buried vias");
  const board = boards[0];
  if (![board.min_trace_width, board.min_via_pad_diameter, board.min_via_hole_diameter].every(value => Number.isFinite(value) && value > 0) || board.min_via_pad_diameter <= board.min_via_hole_diameter)
    throw new Error("Missing native peripheral trace or manufactured via dimensions");
  const expected = new Set(pairRules.flatMap(pair => pair.signals));
  const source = json.filter(element => element.type === "source_trace" && expected.has(element.name));
  if (source.length !== 24 || new Set(source.map(element => element.name)).size !== 24 || new Set(source.map(element => element.source_trace_id)).size !== 24)
    throw new Error("Expected all 24 native USB/TMDS source traces exactly once");
  const byName = new Map(source.map(element => [element.name, element]));
  const ids = new Set(source.map(element => element.source_trace_id));
  const buses = json.filter(element => element.type === "source_bus");
  const pairs = pairRules.map(rule => {
    const members = rule.signals.map(name => byName.get(name)!.source_trace_id) as [string, string];
    const declared = buses.filter(element => element.name === rule.name);
    if (declared.length !== 1 || JSON.stringify(declared[0].source_trace_ids) !== JSON.stringify(members) ||
        !Number.isFinite(declared[0].max_length_skew) || declared[0].max_length_skew < 0 || declared[0].max_length_skew > rule.skew)
      throw new Error(`Missing, incomplete or relaxed native differential pair: ${rule.name}`);
    return { connectionNames: members, lengthTolerance: declared[0].max_length_skew, traceGap: rule.gap };
  });
  const nativePads = json.filter(element => element.type === "pcb_smtpad");
  const nativeHoles = json.filter(element => element.type === "pcb_plated_hole");
  const rotations = new Map(json.filter(element => element.type === "pcb_component").map(element => [element.pcb_component_id, element.rotation ?? 0]));
  const nativePorts = json.filter(element => element.type === "pcb_port");
  const connections = source.map(element => {
    if (!Array.isArray(element.connected_source_port_ids) || element.connected_source_port_ids.length !== 2 || new Set(element.connected_source_port_ids).size !== 2)
      throw new Error(`Expected two distinct native terminals for ${element.name}`);
    const pointsToConnect = element.connected_source_port_ids.map((sourcePortId: string) => {
      const matches = nativePorts.filter(port => port.source_port_id === sourcePortId);
      const port = matches[0];
      if (matches.length !== 1 || typeof port.pcb_port_id !== "string" || !Array.isArray(port.layers) || !port.layers.some(outer) || ![port.x, port.y].every(Number.isFinite))
        throw new Error(`Missing unique native outer terminal for ${element.name}`);
      const pads = nativePads.filter(pad => pad.pcb_port_id === port.pcb_port_id && pad.pcb_component_id === port.pcb_component_id && port.layers.includes(pad.layer));
      const anchoredLayers = pads.filter(pad => copperPolygonsTouch(circlePolygon({ x: port.x, y: port.y }, eps), getSmtPadPolygon(pad as any))).map(pad => pad.layer);
      for (const hole of nativeHoles.filter(hole => hole.pcb_port_id === port.pcb_port_id && hole.pcb_component_id === port.pcb_component_id && samePoint(hole, port))) {
        if (fullSpan.every(layer => hole.layers?.includes(layer)) && hole.layers.length === 4 && Number.isFinite(hole.outer_diameter) && Number.isFinite(hole.hole_diameter) && hole.outer_diameter > hole.hole_diameter && hole.hole_diameter > 0)
          anchoredLayers.push(...hole.layers.filter((layer: string) => port.layers.includes(layer)));
      }
      const layers = [...new Set(anchoredLayers)].filter(outer);
      if (!layers.length || port.layers.some((layer: string) => outer(layer) && !layers.includes(layer)))
        throw new Error(`Native port has no physical pad/barrel anchor on its declared outer layers for ${element.name}`);
      return { x: port.x, y: port.y, layer: layers.includes("top") ? "top" : "bottom", layers, pcb_port_id: port.pcb_port_id };
    });
    return { name: element.source_trace_id, source_trace_id: element.source_trace_id, nominalTraceWidth: board.min_trace_width, pointsToConnect };
  });
  const owner = new Map(connections.flatMap(connection => connection.pointsToConnect.map((point: any) => [point.pcb_port_id, connection.name] as const)));
  const obstacles = [...nativePads, ...nativeHoles].map(pad => {
    const box = (pad.type === "pcb_smtpad" ? getSmtPadPolygon(pad as any) : getPlatedHolePolygon(pad as any, rotations.get(pad.pcb_component_id))).box;
    if (![box.xmin, box.xmax, box.ymin, box.ymax].every(Number.isFinite)) throw new Error(`Invalid native pad geometry: ${pad.pcb_smtpad_id}`);
    return { type: "rect" as const, componentId: pad.pcb_component_id, center: { x: (box.xmin + box.xmax) / 2, y: (box.ymin + box.ymax) / 2 },
      width: box.xmax - box.xmin, height: box.ymax - box.ymin, layers: pad.type === "pcb_smtpad" ? [pad.layer] : pad.layers,
      connectedTo: [pad.pcb_smtpad_id, pad.pcb_port_id, owner.get(pad.pcb_port_id)].filter((id): id is string => typeof id === "string"),
      circuitJsonMetadata: { pcb_smtpad_id: pad.pcb_smtpad_id, pcb_port_id: pad.pcb_port_id } };
  });
  const barrels = json.filter(element => element.type === "pcb_via");
  const mapTrace = (element: any) => {
    if (typeof element.pcb_trace_id !== "string" || !Array.isArray(element.route)) throw new Error("Native peripheral copper lacks a trace ID or route");
    return { ...element, connection_name: element.source_trace_id, route: element.route.map((point: any, index: number) => {
      if (point.route_type !== "via" || !ids.has(element.source_trace_id)) return point;
      const matches = barrels.filter(barrel => samePoint(barrel, point));
      if (matches.length !== 1 || typeof matches[0].pcb_via_id !== "string" || matches[0].pcb_trace_id !== element.pcb_trace_id ||
          (matches[0].source_trace_id !== undefined && matches[0].source_trace_id !== element.source_trace_id))
        throw new Error(`Peripheral trace ${element.pcb_trace_id} has no unique manufactured native full-stack barrel owned by that route`);
      const barrel = matches[0];
      const equalLayers = (layers: unknown) => Array.isArray(layers) && Array.isArray(barrel.layers) && layers.length === barrel.layers.length && new Set(layers).size === layers.length && layers.every(layer => barrel.layers.includes(layer));
      if ([point.via_diameter, point.outer_diameter].some(value => value !== undefined && value !== barrel.outer_diameter) ||
          [point.via_hole_diameter, point.hole_diameter].some(value => value !== undefined && value !== barrel.hole_diameter) ||
          (point.layers !== undefined && !equalLayers(point.layers)))
        throw new Error(`Peripheral trace ${element.pcb_trace_id} disagrees with its native manufactured barrel dimensions or span`);
      const from = point.from_layer ?? element.route[index - 1]?.layer;
      const to = point.to_layer ?? element.route[index + 1]?.layer;
      if ((barrel.from_layer !== undefined && barrel.from_layer !== from) || (barrel.to_layer !== undefined && barrel.to_layer !== to))
        throw new Error(`Peripheral trace ${element.pcb_trace_id} disagrees with its native barrel transition`);
      const layers = Array.isArray(barrel.layers) && barrel.layers.length === 4 && fullSpan.every(layer => barrel.layers.includes(layer)) ? [...fullSpan] : barrel.layers;
      return { ...point, from_layer: from, to_layer: to, layers, via_diameter: barrel.outer_diameter, via_hole_diameter: barrel.hole_diameter };
    }) } as Trace;
  };
  const input: SimpleRouteJson = {
    layerCount: 4, allowedLayers: ["top", "bottom"], minTraceWidth: board.min_trace_width,
    minViaPadDiameter: board.min_via_pad_diameter, minViaHoleDiameter: board.min_via_hole_diameter,
    minTraceToPadEdgeClearance: board.min_trace_to_pad_edge_clearance, minBoardEdgeClearance: board.min_board_edge_clearance,
    allowBlindAndBuriedVias: false,
    bounds: { minX: board.center.x - board.width / 2, maxX: board.center.x + board.width / 2, minY: board.center.y - board.height / 2, maxY: board.center.y + board.height / 2 },
    obstacles, connections, differentialPairs: pairs,
    traces: json.filter(element => element.type === "pcb_trace" && !ids.has(element.source_trace_id)).map(mapTrace),
  };
  const traces = json.filter(element => element.type === "pcb_trace" && ids.has(element.source_trace_id)).map(mapTrace);
  return { input, traces, names: Object.fromEntries(source.map(element => [element.source_trace_id, element.name])) };
}

/** Pad-to-pad planar length and exterior spacing on materialized native copper.
 * The full-board audit separately verifies clearance and copper connectivity. */
export function auditNativePeripheralGeometry(json: readonly Record<string, any>[]) {
  const failures: string[] = [];
  try {
    const { input, traces, names } = nativePeripheralGeometryInput(json);
    const barrels = json.filter(element => element.type === "pcb_via");
    const measurements = input.connections.map(connection => {
      const before = failures.length;
      const matches = traces.filter(trace => trace.source_trace_id === connection.name);
      if (matches.length !== 1) failures.push(`${names[connection.name]}: expected one complete native route, got ${matches.length}`);
      const trace = matches[0], route = Array.isArray(trace?.route) ? trace.route : [];
      let lengthMm = 0;
      for (let index = 0; index < route.length; index++) {
        const point = route[index], previous = route[index - 1];
        if (![point.x, point.y].every(Number.isFinite)) failures.push(`${names[connection.name]}: nonfinite route coordinate`);
        if (point.route_type === "wire") {
          if (!outer(point.layer) || !Number.isFinite(point.width) || point.width !== input.minTraceWidth)
            failures.push(`${names[connection.name]}: wire must have native width on TOP or BOTTOM`);
        } else if (point.route_type === "via") {
          if (!outer(point.from_layer) || !outer(point.to_layer) || point.from_layer === point.to_layer || JSON.stringify(point.layers) !== JSON.stringify(fullSpan) ||
              point.via_diameter !== input.minViaPadDiameter || point.via_hole_diameter !== input.minViaHoleDiameter)
            failures.push(`${names[connection.name]}: route via must have native dimensions and the explicit full four-layer span`);
          if (!barrels.some(barrel => barrel.pcb_trace_id === (trace as any).pcb_trace_id && samePoint(barrel, point) &&
              Array.isArray(barrel.layers) && barrel.layers.length === 4 && fullSpan.every(layer => barrel.layers.includes(layer)) && barrel.outer_diameter === input.minViaPadDiameter && barrel.hole_diameter === input.minViaHoleDiameter &&
              (barrel.from_layer === undefined || barrel.from_layer === point.from_layer) && (barrel.to_layer === undefined || barrel.to_layer === point.to_layer)))
            failures.push(`${names[connection.name]}: route via lacks its manufactured native full-stack barrel`);
        } else failures.push(`${names[connection.name]}: unsupported native route primitive`);
        if (!previous) continue;
        if (previous.route_type === "wire" && point.route_type === "wire") {
          if (previous.layer !== point.layer) failures.push(`${names[connection.name]}: layer change without a via`);
          else lengthMm += Math.hypot(point.x - previous.x, point.y - previous.y);
        } else if (previous.route_type === "wire" && point.route_type === "via") {
          if (!samePoint(previous, point) || previous.layer !== point.from_layer) failures.push(`${names[connection.name]}: discontinuous wire-to-via handoff`);
        } else if (previous.route_type === "via" && point.route_type === "wire") {
          if (!samePoint(previous, point) || previous.to_layer !== point.layer) failures.push(`${names[connection.name]}: discontinuous via-to-wire handoff`);
        } else failures.push(`${names[connection.name]}: consecutive vias or unsupported handoff`);
      }
      const first = route[0], last = route.at(-1), [a, b] = connection.pointsToConnect;
      const matchesPad = (point: any, pad: any) => point?.route_type === "wire" && (pad.layers ?? [pad.layer]).includes(point.layer) && samePoint(point, pad);
      if (route.length < 2 || !((matchesPad(first, a) && matchesPad(last, b)) || (matchesPad(first, b) && matchesPad(last, a))))
        failures.push(`${names[connection.name]}: route endpoints do not match actual native pad coordinates and layers`);
      const viaCount = route.filter(point => point.route_type === "via").length;
      return { name: names[connection.name], connectionName: connection.name, lengthMm, viaCount, pass: failures.length === before };
    });
    const coupling = exteriorPairSpacingReports(input, traces);
    const pairs = pairRules.map((rule, index) => {
      const members = rule.signals.map(name => measurements.find(measurement => measurement.name === name)!);
      const skewMm = Math.abs(members[0].lengthMm - members[1].lengthMm);
      const report = coupling[index];
      const maxSkewMm = input.differentialPairs![index].lengthTolerance;
      const pass = members.every(member => member.pass) && skewMm <= maxSkewMm + eps && report?.applicable === true && report.matched;
      if (!pass) failures.push(`${rule.name}: native complete-route, skew or physical exterior-coupling check failed`);
      return { name: rule.name, signals: rule.signals, maxSkewMm, skewMm, traceGapMm: rule.gap, coupling: report, pass };
    });
    return { pass: failures.length === 0 && pairs.length === 12 && traces.length === 24, failures, measurements, pairs, coupling, input, traces, names };
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { pass: false, failures, measurements: [], pairs: [], coupling: [] };
  }
}
