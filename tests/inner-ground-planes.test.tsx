import { beforeAll, expect, test } from "bun:test";
import { RootCircuit } from "@tscircuit/core";
import {
  copperPolygonsTouch,
  getPourPolygon,
  getViaPolygon,
} from "@tscircuit/circuit-json-util";
import type { AnyCircuitElement } from "circuit-json";
import { auditInnerGroundPlanes } from "../scripts/inner-ground-plane-audit";

// Author the surface connections, without letting an autorouter create another
// barrel that could conceal a disconnected inner-plane bridge.
const noRoutes = async () => {
  let complete: ((result: { traces: [] }) => void) | undefined;
  return {
    on(event: string, handler: (result: { traces: [] }) => void) {
      if (event === "complete") complete = handler;
    },
    start() { complete?.({ traces: [] }); },
    stop() {},
  };
};

let nativeJson: AnyCircuitElement[];

beforeAll(async () => {
  const circuit = new RootCircuit();
  circuit.schematicDisabled = true;
  circuit.add(
    <board width={10} height={8} layers={4} autorouter={{ algorithmFn: noRoutes }}>
      <net name="GND" />
      <net name="VCC" />
      <chip name="JTOP" pcbX={-2} pinLabels={{ pin1: "GND" }}
        connections={{ pin1: "net.GND" }}
        footprint={<footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0}
          shape="rect" width={0.7} height={0.7} /></footprint>} />
      <chip name="JBOTTOM" pcbX={2} pcbY={-2} layer="bottom"
        pinLabels={{ pin1: "GND" }} connections={{ pin1: "net.GND" }}
        footprint={<footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0}
          shape="rect" width={0.7} height={0.7} /></footprint>} />
      <via name="VGND" pcbX={0} pcbY={0} fromLayer="top" toLayer="bottom"
        holeDiameter={0.3} outerDiameter={0.6} connectsTo="net.GND" />
      <via name="VVCC" pcbX={2} pcbY={1} fromLayer="top" toLayer="bottom"
        holeDiameter={0.3} outerDiameter={0.6} connectsTo="net.VCC" />
      <trace from="JTOP.pin1" to="VGND.top" pcbStraightLine thickness={0.15} />
      <trace from="JBOTTOM.pin1" to="VGND.bottom" pcbStraightLine thickness={0.15} />
      <copperpour layer="inner1" connectsTo="net.GND" unbroken
        coveredWithSolderMask clearance={0.2} boardEdgeMargin={0.3} />
      <copperpour layer="inner2" connectsTo="net.GND" unbroken
        coveredWithSolderMask clearance={0.2} boardEdgeMargin={0.3} />
    </board>,
  );
  await circuit.renderUntilSettled();
  nativeJson = circuit.getCircuitJson();
});

test("native four-layer pours contact the GND barrel and clear the foreign barrel", () => {
  expect(nativeJson.find((element) => element.type === "pcb_board")?.num_layers).toBe(4);
  const pours = nativeJson.filter((element) => element.type === "pcb_copper_pour");
  const vias = nativeJson.filter((element) => element.type === "pcb_via");
  const groundNet = nativeJson.filter((element) => element.type === "source_net")
    .find((element) => element.name === "GND")!;
  const groundVia = vias.find((via) => via.x === 0 && via.y === 0)!;
  const foreignVia = vias.find((via) => via.x === 2 && via.y === 1)!;
  expect(pours).toHaveLength(2);
  expect(vias).toHaveLength(2);
  expect(pours.map((pour) => pour.layer).sort()).toEqual(["inner1", "inner2"]);
  expect(groundVia.layers).toEqual(["top", "inner1", "inner2", "bottom"]);
  expect(foreignVia.layers).toEqual(groundVia.layers);
  for (const pour of pours) {
    expect(pour).toMatchObject({ shape: "brep", source_net_id: groundNet.source_net_id,
      covered_with_solder_mask: true });
    expect(copperPolygonsTouch(getPourPolygon(pour),
      getViaPolygon(groundVia, groundVia.outer_diameter, groundVia.hole_diameter))).toBe(true);
    expect(copperPolygonsTouch(getPourPolygon(pour),
      getViaPolygon(foreignVia, foreignVia.outer_diameter, foreignVia.hole_diameter))).toBe(false);
  }
  expect(nativeJson.filter((element) => element.type === "pcb_trace")).toHaveLength(2);
  const pads = nativeJson.filter((element) => element.type === "pcb_smtpad");
  expect(pads).toHaveLength(2);
  expect(pads.map((pad) => pad.layer).sort()).toEqual(["bottom", "top"]);
  expect(nativeJson.filter((element) => element.type === "source_runtime_error")).toEqual([]);
});

test("accepts the emitted planes and physical GND-pad connections", () => {
  const before = JSON.stringify(nativeJson);
  const result = auditInnerGroundPlanes(nativeJson, { minViaAntipadClearanceMm: 0.19 });
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
  expect(result.innerPours).toHaveLength(2);
  expect(result.innerPours.every((pour) => pour.areaMm2 > 50)).toBe(true);
  const groundVia = nativeJson.filter((element) => element.type === "pcb_via")
    .find((via) => via.x === 0 && via.y === 0)!;
  expect(result.groundBridgeViaIds).toEqual([groundVia.pcb_via_id]);
  expect(result.foreignViaAntipads.map((antipad) => antipad.layer).sort())
    .toEqual(["inner1", "inner2"]);
  expect(result.foreignViaAntipads.every((antipad) => antipad.clearanceMm >= 0.19)).toBe(true);
  expect(result.disconnectedGroundPortIds).toEqual([]);
  expect(result.floatingInnerPourIds).toEqual([]);
  expect(JSON.stringify(nativeJson)).toBe(before);
});

test("rejects an unconnected GND source pad when its authored surface trace is removed", () => {
  const json = structuredClone(nativeJson);
  const pad = json.filter((element) => element.type === "pcb_smtpad")
    .find((element) => element.layer === "top")!;
  const traceIndex = json.findIndex((element) => element.type === "pcb_trace" &&
    element.route.some((point) => point.route_type === "wire" && point.layer === "top"));
  expect(traceIndex).toBeGreaterThanOrEqual(0);
  json.splice(traceIndex, 1);
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.disconnectedGroundPortIds).toContain(pad.pcb_port_id!);
  expect(result.groundBridgeViaIds).toHaveLength(1);
});

test("endpoint metadata cannot conceal a physically disconnected GND pad", () => {
  const json = structuredClone(nativeJson);
  const pad = json.filter((element) => element.type === "pcb_smtpad")
    .find((element) => element.layer === "top")!;
  const traceIndex = json.findIndex((element) => element.type === "pcb_trace" &&
    element.route.some((point) => point.route_type === "wire" && point.layer === "top"));
  json.splice(traceIndex, 1);
  const otherTrace = json.filter((element) => element.type === "pcb_trace")[0]!;
  const point = otherTrace.route.find((point) => point.route_type === "wire")!;
  if (point.route_type !== "wire") throw new Error("Missing native wire");
  point.start_pcb_port_id = pad.pcb_port_id;
  point.end_pcb_port_id = pad.pcb_port_id;
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.disconnectedGroundPortIds).toContain(pad.pcb_port_id!);
});

test("a surface GND pour can physically feed pads into the inner-plane barrel", () => {
  const json = structuredClone(nativeJson);
  const bottomTraceIndex = json.findIndex((element) => element.type === "pcb_trace" &&
    element.route.some((point) => point.route_type === "wire" && point.layer === "bottom"));
  json.splice(bottomTraceIndex, 1);
  const surface = structuredClone(json.filter((element) => element.type === "pcb_copper_pour")[0]!);
  surface.pcb_copper_pour_id = "surface_ground_contact";
  surface.layer = "bottom";
  json.push(surface);
  const result = auditInnerGroundPlanes(json);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
  expect(result.disconnectedGroundPortIds).toEqual([]);
});

test.each(["ground", "foreign"] as const)("rejects a %s via missing its inner-layer barrel span", (net) => {
  const json = structuredClone(nativeJson);
  const via = json.filter((element) => element.type === "pcb_via")
    .find((element) => element.x === (net === "ground" ? 0 : 2))!;
  via.layers = ["top", "bottom"];
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.incompleteViaSpans).toContain(via.pcb_via_id);
});

test("rejects a GND barrel outside the emitted planes", () => {
  const json = structuredClone(nativeJson);
  const via = json.filter((element) => element.type === "pcb_via")
    .find((element) => element.x === 0 && element.y === 0)!;
  via.x = 8;
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.groundBridgeViaIds).toEqual([]);
  expect(result.floatingInnerPourIds).toHaveLength(2);
  expect(result.disconnectedGroundPortIds.length).toBeGreaterThan(0);
});

test("rejects a filled foreign-via antipad in native BREP geometry", () => {
  const json = structuredClone(nativeJson);
  const via = json.filter((element) => element.type === "pcb_via")
    .find((element) => element.x === 2 && element.y === 1)!;
  const pour = json.filter((element) => element.type === "pcb_copper_pour")
    .find((element) => element.layer === "inner1")!;
  expect(pour.shape).toBe("brep");
  if (pour.shape !== "brep") throw new Error("Native fixture did not emit BREP");
  const holeIndex = pour.brep_shape.inner_rings.findIndex((ring) =>
    ring.vertices.every((vertex) => Math.hypot(vertex.x - via.x, vertex.y - via.y) < 0.8));
  expect(holeIndex).toBeGreaterThanOrEqual(0);
  pour.brep_shape.inner_rings.splice(holeIndex, 1);
  expect(copperPolygonsTouch(getPourPolygon(pour),
    getViaPolygon(via, via.outer_diameter, via.hole_diameter))).toBe(true);
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.foreignViaAntipads.find((antipad) => antipad.layer === "inner1")?.clearanceMm).toBe(0);
});

test("rejects an inner plane assigned to the foreign source net", () => {
  const json = structuredClone(nativeJson);
  const foreignNet = json.filter((element) => element.type === "source_net")
    .find((element) => element.name === "VCC")!;
  const pour = json.filter((element) => element.type === "pcb_copper_pour")
    .find((element) => element.layer === "inner2")!;
  pour.source_net_id = foreignNet.source_net_id;
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.groundBridgeViaIds).toEqual([]);
});

test("rejects inner-plane soldermask openings that the Gerber exporter cannot emit", () => {
  const json = structuredClone(nativeJson);
  const pour = json.filter((element) => element.type === "pcb_copper_pour")[0]!;
  pour.covered_with_solder_mask = false;
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.failures.some((failure) => failure.includes("soldermask openings"))).toBe(true);
});

test("enforces the requested measured foreign-via antipad clearance", () => {
  const measured = auditInnerGroundPlanes(nativeJson).foreignViaAntipads;
  expect(measured).toHaveLength(2);
  const smallestGap = Math.min(...measured.map((antipad) => antipad.clearanceMm));
  // The native circular antipad is tessellated, so inspect its actual gap.
  expect(smallestGap).toBeGreaterThanOrEqual(0.19);
  expect(smallestGap).toBeLessThanOrEqual(0.201);
  const result = auditInnerGroundPlanes(nativeJson, {
    minViaAntipadClearanceMm: 0.21,
  });
  expect(result.pass).toBe(false);
  expect(result.failures.some((failure) => failure.includes("Insufficient"))).toBe(true);
});

test("rejects a non-GND wire routed on an inner plane layer", () => {
  const json = structuredClone(nativeJson);
  const foreignNet = json.filter((element) => element.type === "source_net")
    .find((element) => element.name === "VCC")!;
  const sourceTrace = structuredClone(json.filter((element) => element.type === "source_trace")[0]!);
  sourceTrace.source_trace_id = "foreign_inner_source_trace";
  sourceTrace.connected_source_port_ids = [];
  sourceTrace.connected_source_net_ids = [foreignNet.source_net_id];
  const trace = structuredClone(json.filter((element) => element.type === "pcb_trace")[0]!);
  trace.pcb_trace_id = "foreign_inner_trace";
  trace.source_trace_id = sourceTrace.source_trace_id;
  trace.route = [
    { route_type: "wire", x: -2, y: 2, layer: "inner1", width: 0.15 },
    { route_type: "wire", x: 2, y: 2, layer: "inner1", width: 0.15 },
  ];
  json.push(sourceTrace, trace);
  const result = auditInnerGroundPlanes(json);
  expect(result.pass).toBe(false);
  expect(result.failures.some((failure) => failure.includes("Non-GND inner-layer wire"))).toBe(true);
});
