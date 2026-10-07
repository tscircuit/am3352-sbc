import { expect, test } from "bun:test";
import { Circuit, getSimpleRouteJsonFromCircuitJson, type Obstacle, type SimpleRouteJson } from "@tscircuit/core";
import type { AnyCircuitElement } from "circuit-json";
import { validateRoutedCopperDrc } from "@tscircuit/fanout-solver";
import { hydrateNativeFixedCopper } from "../design/native-fixed-copper";

const fixture = (async () => {
  const circuit = new Circuit(); circuit.schematicDisabled = true;
  const pad = <footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0} shape="rect" width={0.5} height={0.5} /></footprint>;
  circuit.add(<board width={16} height={12} layers={4} allowBlindAndBuriedVias={false}
    minTraceWidth={0.1} minViaPadDiameter={0.3} minViaHoleDiameter={0.15}>
    <chip name="A" pcbX={-4} pinLabels={{ pin1: "S" }} footprint={pad} />
    <chip name="B" pcbX={4} layer="bottom" pinLabels={{ pin1: "S" }} footprint={pad} />
    <chip name="C" pcbX={-3} pcbY={3} layer="bottom" pinLabels={{ pin1: "OTHER" }} footprint={pad} />
    <chip name="D" pcbX={3} pcbY={3} layer="bottom" pinLabels={{ pin1: "OTHER" }} footprint={pad} />
    <trace from="A.pin1" to="B.pin1" thickness={0.15} pcbPath={["A.pin1", { x: 0, y: 0 },
      { x: 0, y: 0, via: true, fromLayer: "top", toLayer: "bottom" }, { x: 0, y: 0, layer: "bottom" }, "B.pin1"]} />
    <trace from="C.pin1" to="D.pin1" pcbStraightLine thickness={0.15} />
  </board>);
  await circuit.renderUntilSettled();
  return circuit.getCircuitJson();
})();

async function input() {
  const native = structuredClone(await fixture);
  const srj = getSimpleRouteJsonFromCircuitJson({ circuitJson: native }).simpleRouteJson;
  return { native, srj };
}
const publicInput = (native: AnyCircuitElement[]) => getSimpleRouteJsonFromCircuitJson({ circuitJson: native }).simpleRouteJson;

function raster(trace: NonNullable<SimpleRouteJson["traces"]>[number], srj: SimpleRouteJson): Obstacle[] {
  const obstacles: Obstacle[] = [];
  for (const [index, point] of trace.route.entries()) {
    if (point.route_type !== "wire" && point.route_type !== "via") throw new Error("Fixture primitive");
    if (point.route_type === "via") obstacles.push({ type: "rect", center: { x: point.x, y: point.y },
      width: srj.minViaPadDiameter!, height: srj.minViaPadDiameter!, layers: ["top", "inner1", "inner2", "bottom"], connectedTo: [trace.connection_name!] });
    const next = trace.route[index + 1];
    if (!next || next.route_type !== "wire" && next.route_type !== "via") continue;
    const width = point.route_type === "wire" ? point.width : next.route_type === "wire" ? next.width : srj.minTraceWidth;
    const dx = next.x - point.x, dy = next.y - point.y;
    const steps = dx === 0 || dy === 0 ? 1 : Math.max(1, Math.ceil(Math.hypot(dx, dy) / width));
    for (let step = 0; step < steps; step++) {
      const x1 = point.x + dx * step / steps, y1 = point.y + dy * step / steps;
      const x2 = point.x + dx * (step + 1) / steps, y2 = point.y + dy * (step + 1) / steps;
      obstacles.push({ type: "rect", layers: [point.route_type === "wire" ? point.layer : point.to_layer],
        center: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, width: Math.abs(x2 - x1) + width,
        height: Math.abs(y2 - y1) + width, connectedTo: [trace.connection_name!] });
    }
  }
  return obstacles;
}

test("authenticates exact native preloads, retains phase fields and is byte-idempotent", async () => {
  const { native, srj } = await input();
  const preload = srj.traces![0]!;
  (preload as typeof preload & { annotation: string }).annotation = "previous phase bytes";
  const earlierPhase = structuredClone(preload); earlierPhase.pcb_trace_id = "previous-phase-route";
  for (const point of earlierPhase.route) if ("y" in point) point.y -= 2;
  srj.traces!.push(earlierPhase);
  const unrelated: Obstacle = { type: "rect", layers: ["bottom"], center: { x: 6, y: -4 }, width: 0.6, height: 0.7,
    isNonPlatedHole: true, connectedTo: [] };
  srj.obstacles.push(unrelated);
  srj.buses = [{ name: "test", connectionNames: srj.connections.map(connection => connection.name), traceWidth: 0.1 }];
  const before = JSON.stringify(srj), nativeBefore = JSON.stringify(native), traceBytes = JSON.stringify(srj.traces);
  const hydrated = hydrateNativeFixedCopper(srj, native);
  expect(hydrated.proof.addedTraceCount).toBe(0);
  expect(hydrated.proof.removedTraceProxyCount).toBe(0);
  expect(hydrated.input.connections).toBe(srj.connections);
  expect(hydrated.input.buses).toBe(srj.buses);
  expect(hydrated.input.bounds).toBe(srj.bounds);
  expect(JSON.stringify(hydrated.input.traces)).toBe(traceBytes);
  expect(hydrated.input.obstacles).toContain(unrelated);
  expect(JSON.stringify(srj)).toBe(before);
  expect(JSON.stringify(native)).toBe(nativeBefore);
  expect(JSON.stringify(hydrateNativeFixedCopper(hydrated.input, native).input)).toBe(JSON.stringify(hydrated.input));
});

test("restores rasterized copper only after authenticating every original proxy", async () => {
  const { native, srj } = await input();
  const traces = srj.traces!;
  const proxies = traces.flatMap(trace => raster(trace, srj));
  srj.traces = []; srj.obstacles.push(...proxies);
  const before = JSON.stringify(srj);
  const hydrated = hydrateNativeFixedCopper(srj, native);
  expect(hydrated.proof.addedTraceCount).toBe(traces.length);
  expect(hydrated.proof.removedTraceProxyCount).toBe(proxies.length);
  expect(hydrated.input.obstacles.some(obstacle => proxies.includes(obstacle))).toBe(false);
  const via = hydrated.input.traces![0]!.route.find(point => point.route_type === "via")!;
  const barrel = native.find(element => element.type === "pcb_via")!;
  expect(via.route_type).toBe("via");
  if (via.route_type !== "via" || barrel.type !== "pcb_via") throw new Error("Fixture barrel");
  expect(via.via_diameter).toBe(barrel.outer_diameter);
  expect(via.via_hole_diameter).toBe(barrel.hole_diameter);
  expect(via.layers).toEqual(barrel.layers);
  expect(JSON.stringify(srj)).toBe(before);
  const stale = structuredClone(srj); stale.obstacles.at(-1)!.center.x += 0.01;
  expect(() => hydrateNativeFixedCopper(stale, native)).toThrow("stale");
  const missing = structuredClone(srj); missing.obstacles.pop();
  expect(() => hydrateNativeFixedCopper(missing, native)).toThrow("missing or stale");
});

test("rejects stale geometry and foreign ownership instead of borrowing native aliases", async () => {
  const { native, srj } = await input();
  const stale = structuredClone(native);
  const trace = stale.find(element => element.type === "pcb_trace")!;
  if (trace.type !== "pcb_trace") throw new Error("Fixture trace");
  trace.route[0]!.x += 0.02;
  expect(() => hydrateNativeFixedCopper(srj, stale)).toThrow("preload geometry");
  const moved = structuredClone(srj); moved.obstacles[0]!.center.y += 0.01;
  expect(() => hydrateNativeFixedCopper(moved, native)).toThrow("stale obstacle");
  const foreign = structuredClone(srj);
  foreign.traces![0]!.connection_name = foreign.traces![1]!.connection_name;
  expect(() => hydrateNativeFixedCopper(foreign, native)).toThrow("foreign owner");
  const foreignPad = structuredClone(srj);
  foreignPad.obstacles[0]!.connectedTo.push(srj.traces![1]!.connection_name!);
  expect(() => hydrateNativeFixedCopper(foreignPad, native)).toThrow("foreign owner");
});

test("requires the actual unique native barrel and rejects duplicate physical preloads", async () => {
  const { native, srj } = await input();
  expect(() => hydrateNativeFixedCopper(srj, native.filter(element => element.type !== "pcb_via"))).toThrow("authenticated barrel");
  const blind = structuredClone(native); const via = blind.find(element => element.type === "pcb_via")!;
  if (via.type !== "pcb_via") throw new Error("Fixture via");
  via.layers = ["top", "bottom"];
  expect(() => hydrateNativeFixedCopper(srj, blind)).toThrow();
  via.layers = ["top", "top", "bottom", "bottom"];
  expect(() => hydrateNativeFixedCopper(srj, blind)).toThrow();
  const duplicate = structuredClone(srj); duplicate.traces!.push(structuredClone(duplicate.traces![0]!));
  expect(() => hydrateNativeFixedCopper(duplicate, native)).toThrow("Duplicate");
  duplicate.traces!.at(-1)!.pcb_trace_id = "previous-phase-same-physical-copper";
  expect(() => hydrateNativeFixedCopper(duplicate, native)).toThrow("same native copper");
  const badDrill = structuredClone(srj); const point = badDrill.traces![0]!.route.find(point => point.route_type === "via")!;
  if (point.route_type !== "via") throw new Error("Fixture inline via");
  point.via_hole_diameter = 0.01;
  expect(() => hydrateNativeFixedCopper(badDrill, native)).toThrow("preload geometry");
  point.via_hole_diameter = undefined;
  point.layers = ["top", "top", "bottom", "bottom"];
  expect(() => hydrateNativeFixedCopper(badDrill, native)).toThrow("preload geometry");
});

test.each(["circle", "rotated_pill"])("derives actual %s copper without turning rectangles into rounded pads", async shape => {
  const { native } = await input();
  const pad = native.find(element => element.type === "pcb_smtpad")!;
  if (pad.type !== "pcb_smtpad") throw new Error("Fixture pad");
  Object.assign(pad, { shape, width: shape === "circle" ? 0.5 : 1.5, height: 0.5, radius: 0.25, ccw_rotation: 31 });
  const srj = publicInput(native);
  // Legacy phase converters omit the round shape on an otherwise exact land envelope.
  if (shape === "circle") srj.obstacles.find(obstacle => obstacle.circuitJsonMetadata?.pcb_smtpad_id === pad.pcb_smtpad_id)!.shape = undefined;
  const before = JSON.stringify(srj);
  const hydrated = hydrateNativeFixedCopper(srj, native);
  expect(hydrated.proof.shapeRefinements).toContainEqual({ nativeId: pad.pcb_smtpad_id, nativeShape: shape, primitiveCount: shape === "circle" ? 1 : 3 });
  const nativePad = hydrated.input.obstacles.find(obstacle => obstacle.circuitJsonMetadata?.pcb_smtpad_id === pad.pcb_smtpad_id)!;
  expect(nativePad.shape).toBe(shape === "circle" ? "circle" : undefined);
  expect(JSON.stringify(srj)).toBe(before);
  expect(JSON.stringify(hydrateNativeFixedCopper(hydrated.input, native).input)).toBe(JSON.stringify(hydrated.input));
  const otherRect = hydrated.input.obstacles.find(obstacle => obstacle.circuitJsonMetadata?.pcb_smtpad_id && obstacle.circuitJsonMetadata.pcb_smtpad_id !== pad.pcb_smtpad_id)!;
  expect(otherRect.shape).toBeUndefined();
});

test("exact native rounded copper still rejects a real clearance violation", async () => {
  const { native } = await input();
  const pad = native.filter(element => element.type === "pcb_smtpad")[2]!;
  Object.assign(pad, { shape: "circle", x: 0, y: 0.2, width: 0.3, height: 0.3, radius: 0.15 });
  const srj = publicInput(native); srj.connections = [];
  const prepared = hydrateNativeFixedCopper(srj, native).input;
  const signalOnly = { ...prepared, traces: [prepared.traces![0]!] };
  const report = validateRoutedCopperDrc({ inputSrj: prepared, routedSrj: signalOnly, clearance: 0.1, allowBlindAndBuriedVias: false });
  expect(report.issues.some(issue => issue.code === "trace-obstacle-clearance")).toBe(true);
});
