import { beforeAll, expect, test } from "bun:test";
import { RootCircuit } from "@tscircuit/core";
import { copperPolygonsTouch, getPourPolygon, getViaPolygon } from "@tscircuit/circuit-json-util";
import type { AnyCircuitElement } from "circuit-json";
import { auditPhysicalCopperConnectivity } from "../scripts/physical-copper-connectivity";

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
let internalChannelJson: AnyCircuitElement[];

beforeAll(async () => {
  const circuit = new RootCircuit();
  circuit.schematicDisabled = true;
  circuit.add(
    <board width={10} height={8} layers={4} autorouter={{ algorithmFn: noRoutes }}>
      <net name="GND" />
      <net name="VCC" />
      {[
        { name: "GND_TOP", net: "GND", x: -3, y: 2, layer: "top" },
        { name: "GND_BOTTOM", net: "GND", x: -3, y: -2, layer: "bottom" },
        { name: "VCC_TOP", net: "VCC", x: 3, y: 2, layer: "top" },
        { name: "VCC_BOTTOM", net: "VCC", x: 3, y: -2, layer: "bottom" },
      ].map((pad) => (
        <chip key={pad.name} name={pad.name} pcbX={pad.x} pcbY={pad.y}
          layer={pad.layer as "top" | "bottom"} pinLabels={{ pin1: pad.net }}
          connections={{ pin1: `net.${pad.net}` }}
          footprint={<footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0}
            shape="rect" width={0.7} height={0.7} /></footprint>} />
      ))}
      <via name="VGND" pcbX={-1} pcbY={0} fromLayer="top" toLayer="bottom"
        holeDiameter={0.3} outerDiameter={0.6} connectsTo="net.GND" />
      <via name="VVCC" pcbX={2} pcbY={0} fromLayer="top" toLayer="bottom"
        holeDiameter={0.3} outerDiameter={0.6} connectsTo="net.VCC" />
      <trace from="GND_TOP.pin1" to="VGND.top" pcbStraightLine thickness={0.15} />
      <trace from="GND_BOTTOM.pin1" to="VGND.bottom" pcbStraightLine thickness={0.15} />
      <trace from="VCC_TOP.pin1" to="VVCC.top" pcbStraightLine thickness={0.15} />
      <trace from="VCC_BOTTOM.pin1" to="VVCC.bottom" pcbStraightLine thickness={0.15} />
      <copperpour layer="inner1" connectsTo="net.GND" unbroken
        coveredWithSolderMask clearance={0.2} boardEdgeMargin={0.3} />
    </board>,
  );
  await circuit.renderUntilSettled();
  nativeJson = circuit.getCircuitJson();
  const channel = new RootCircuit();
  channel.schematicDisabled = true;
  channel.add(<board width={10} height={8} layers={4} autorouter={{ algorithmFn: noRoutes }}>
    <net name="INPUT" /><net name="OUTPUT" />
    <chip name="ESD_CHANNEL" pinLabels={{ pin1: "IN", pin2: "OUT" }}
      internallyConnectedPins={[["pin1", "pin2"]]}
      connections={{ pin1: "net.INPUT", pin2: "net.OUTPUT" }}
      footprint={<footprint>
        <smtpad portHints={["1"]} pcbX={-1} pcbY={0} shape="rect" width={0.5} height={0.5} />
        <smtpad portHints={["2"]} pcbX={1} pcbY={0} shape="rect" width={0.5} height={0.5} />
      </footprint>} />
  </board>);
  await channel.renderUntilSettled();
  internalChannelJson = channel.getCircuitJson();
});

test("an explicit internal ESD channel joins two real same-package pad anchors", () => {
  const before = JSON.stringify(internalChannelJson);
  const report = auditPhysicalCopperConnectivity(internalChannelJson);
  expect(report.failures).toEqual([]);
  expect(report.pass).toBe(true);
  expect(report.internalPackageLinks).toHaveLength(1);
  expect(report.internalPackageLinks[0]?.pcbPortIds).toHaveLength(2);
  expect(report.networks).toHaveLength(1);
  expect(report.networks[0]?.componentCount).toBe(1);
  expect(JSON.stringify(internalChannelJson)).toBe(before);
});

test("standalone native internal-connection records preserve the actual package channel", () => {
  const json = structuredClone(internalChannelJson);
  const source = json.filter(e => e.type === "source_component")[0]!;
  expect(source.internally_connected_source_port_ids).toHaveLength(1);
  const group = source.internally_connected_source_port_ids![0]!;
  delete source.internally_connected_source_port_ids;
  json.push({ type: "source_component_internal_connection", source_component_internal_connection_id: "channel", source_component_id: source.source_component_id, source_port_ids: group });
  const report = auditPhysicalCopperConnectivity(json);
  expect(report.failures).toEqual([]);
  expect(report.pass).toBe(true);
  expect(report.internalPackageLinks).toHaveLength(1);
});

test("an internal package declaration cannot replace a missing physical pad", () => {
  const json = structuredClone(internalChannelJson);
  const pad = json.filter(e => e.type === "pcb_smtpad")[0]!;
  json.splice(json.indexOf(pad), 1);
  const report = auditPhysicalCopperConnectivity(json);
  expect(report.pass).toBe(false);
  expect(report.invalidInternalPackageLinks).toHaveLength(1);
  expect(report.internalPackageLinks).toEqual([]);
  expect(report.unanchoredPortIds).toContain(pad.pcb_port_id!);
});

test("internal channels cannot connect a source port belonging to another package", () => {
  const json = structuredClone(internalChannelJson);
  const port = json.filter(e => e.type === "source_port")[0]!;
  port.source_component_id = "another_component";
  const report = auditPhysicalCopperConnectivity(json);
  expect(report.pass).toBe(false);
  expect(report.invalidInternalPackageLinks).toHaveLength(1);
  expect(report.internalPackageLinks).toEqual([]);
});

function topVccPad(json: AnyCircuitElement[]) {
  return json.filter((element) => element.type === "pcb_smtpad")
    .filter((pad) => pad.shape === "rect")
    .find((pad) => pad.x === 3 && pad.y === 2)!;
}

function topVccTrace(json: AnyCircuitElement[]) {
  return json.filter((element) => element.type === "pcb_trace")
    .find((trace) => trace.route.some((point) => point.route_type === "wire" &&
      point.layer === "top" && point.x === 3 && point.y === 2))!;
}

test("accepts two native networks joined by surface copper and full-stack barrels", () => {
  const before = JSON.stringify(nativeJson);
  const pads = nativeJson.filter((element) => element.type === "pcb_smtpad");
  const vias = nativeJson.filter((element) => element.type === "pcb_via");
  const pours = nativeJson.filter((element) => element.type === "pcb_copper_pour");
  expect(pads).toHaveLength(4);
  expect(vias).toHaveLength(2);
  expect(vias.every((via) => via.layers.join(",") === "top,inner1,inner2,bottom")).toBe(true);
  expect(nativeJson.filter((element) => element.type === "pcb_trace")).toHaveLength(4);
  expect(pours).toHaveLength(1);
  const groundVia = vias.find((via) => via.x === -1)!;
  expect(pours[0]).toMatchObject({ layer: "inner1", shape: "brep" });
  expect(copperPolygonsTouch(getPourPolygon(pours[0]!),
    getViaPolygon(groundVia, groundVia.outer_diameter, groundVia.hole_diameter))).toBe(true);
  expect(nativeJson.filter((element) => element.type === "source_runtime_error")).toEqual([]);

  const result = auditPhysicalCopperConnectivity(nativeJson);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
  expect(result.networks).toHaveLength(2);
  expect(result.networks.every((network) => network.componentCount === 1)).toBe(true);
  for (const name of ["GND", "VCC"])
    expect(result.networks.some((network) => network.labels.includes(name))).toBe(true);
  const acceptedPortIds = new Set(result.networks.flatMap((network) => network.portIds));
  expect(pads.every((pad) => !!pad.pcb_port_id && acceptedPortIds.has(pad.pcb_port_id))).toBe(true);
  expect(result.disconnectedPortGroups).toEqual([]);
  expect(result.unanchoredPortIds).toEqual([]);
  expect(result.unsupportedCopperIds).toEqual([]);
  expect(JSON.stringify(nativeJson)).toBe(before);
});

test("constant native segment widths may vary at a supply neck", () => {
  const json = structuredClone(nativeJson);
  const trace = topVccTrace(json);
  const first = trace.route[0]!;
  const last = trace.route.at(-1)!;
  if (first.route_type !== "wire" || last.route_type !== "wire") throw new Error("Expected native wire");
  trace.route.splice(1, 0, { ...first, x: (first.x + last.x) / 2, y: (first.y + last.y) / 2, width: 0.2 });
  const report = auditPhysicalCopperConnectivity(json);
  expect(report.failures).toEqual([]);
  expect(report.pass).toBe(true);
});

test("rejects a missing surface wire while retaining its declared source-net connection", () => {
  const json = structuredClone(nativeJson);
  const trace = topVccTrace(json);
  json.splice(json.indexOf(trace), 1);
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(result.networks.find((network) => network.labels.includes("VCC"))?.componentCount).toBe(2);
  expect(result.disconnectedPortGroups.length).toBeGreaterThan(0);
  expect(result.unanchoredPortIds).toEqual([]);
});

test("rejects a wire on the wrong layer despite its native endpoint port IDs", () => {
  const json = structuredClone(nativeJson);
  const pad = topVccPad(json);
  const trace = topVccTrace(json);
  expect(trace.route.some((point) => point.route_type === "wire" &&
    [point.start_pcb_port_id, point.end_pcb_port_id].includes(pad.pcb_port_id))).toBe(true);
  for (const point of trace.route) if (point.route_type === "wire") point.layer = "bottom";
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(result.networks.find((network) => network.labels.includes("VCC"))?.componentCount).toBe(2);
});

test("endpoint metadata cannot connect a wire that misses the physical pad", () => {
  const json = structuredClone(nativeJson);
  const pad = topVccPad(json);
  const trace = topVccTrace(json);
  for (const point of trace.route) {
    if (point.route_type === "wire" && point.x === pad.x && point.y === pad.y) point.x = 5;
  }
  expect(trace.route.some((point) => point.route_type === "wire" &&
    [point.start_pcb_port_id, point.end_pcb_port_id].includes(pad.pcb_port_id))).toBe(true);
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(result.networks.find((network) => network.labels.includes("VCC"))?.componentCount).toBe(2);
  expect(result.unanchoredPortIds).toEqual([]);
});

test("foreign endpoint labels cannot merge intended electrical owners", () => {
  const json = structuredClone(nativeJson);
  const trace = topVccTrace(json);
  const groundPad = json.filter(e => e.type === "pcb_smtpad").find(pad => pad.x === -3 && pad.y === 2)!;
  const first = trace.route[0]!;
  if (first.route_type !== "wire") throw new Error("Expected native wire");
  first.x = -3; first.y = 2;
  first.start_pcb_port_id = groundPad.pcb_port_id;
  const report = auditPhysicalCopperConnectivity(json);
  expect(report.pass).toBe(false);
  expect(report.foreignCopperContacts.some(contact => [contact.firstId, contact.secondId].includes(trace.pcb_trace_id))).toBe(true);
  expect(report.networks.find(network => network.labels.includes("VCC"))?.labels).not.toContain("GND");
});

test("a missing intended native PCB port cannot disappear from the audit", () => {
  const json = structuredClone(nativeJson);
  const pad = topVccPad(json);
  const port = json.find(e => e.type === "pcb_port" && e.pcb_port_id === pad.pcb_port_id)!;
  if (port.type !== "pcb_port") throw new Error("Expected native port");
  json.splice(json.indexOf(port), 1);
  const report = auditPhysicalCopperConnectivity(json);
  expect(report.pass).toBe(false);
  expect(report.missingSourcePortIds).toContain(port.source_port_id);
});

test("barrel port metadata cannot attach a remote SMD pad", () => {
  const json = structuredClone(nativeJson);
  const pad = topVccPad(json);
  const trace = topVccTrace(json);
  json.splice(json.indexOf(trace), 1);
  const via = json.filter((element) => element.type === "pcb_via").find((element) => element.x === 2)!;
  via.pcb_port_ids = [...via.pcb_port_ids ?? [], pad.pcb_port_id!];
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(result.networks.find((network) => network.labels.includes("VCC"))?.componentCount).toBe(2);
  expect(result.unanchoredPortIds).toEqual([]);
});

test("one trace ID cannot join its geometrically separate wire segments", () => {
  const json = structuredClone(nativeJson);
  const trace = topVccTrace(json);
  // Layer transitions without a physical barrel leave three distinct chords.
  // The first and last chords retain the same native trace/source ownership.
  trace.route = [
    { route_type: "wire", x: 3, y: 2, layer: "top", width: 0.15 },
    { route_type: "wire", x: 3, y: 1, layer: "top", width: 0.15 },
    { route_type: "wire", x: -4, y: 3, layer: "bottom", width: 0.15 },
    { route_type: "wire", x: -4, y: 2, layer: "bottom", width: 0.15 },
    { route_type: "wire", x: 2, y: 0.4, layer: "top", width: 0.15 },
    { route_type: "wire", x: 2, y: 0, layer: "top", width: 0.15 },
  ];
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(result.networks.find((network) => network.labels.includes("VCC"))?.componentCount)
    .toBeGreaterThanOrEqual(2);
});

test("declared same-net pads remain disconnected physical islands", () => {
  let json = structuredClone(nativeJson);
  const via = json.filter((element) => element.type === "pcb_via").find((element) => element.x === 2)!;
  const viaPortIds = new Set(via.pcb_port_ids ?? []);
  json = json.filter((element) => {
    if (element.type === "pcb_via") return element !== via;
    if (element.type === "pcb_port") return !viaPortIds.has(element.pcb_port_id);
    if (element.type === "pcb_trace") return !element.route.some((point) =>
      point.route_type === "wire" && point.x === 3);
    return true;
  });
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  const network = result.networks.find((entry) => entry.labels.includes("VCC"))!;
  expect(network.portIds).toHaveLength(2);
  expect(network.componentCount).toBe(2);
  expect(result.unanchoredPortIds).toEqual([]);
});

test("a native PCB port needs a physical pad anchor even when a wire names it", () => {
  const json = structuredClone(nativeJson);
  const pad = topVccPad(json);
  json.splice(json.indexOf(pad), 1);
  expect(json.some((element) => element.type === "pcb_port" && element.pcb_port_id === pad.pcb_port_id)).toBe(true);
  expect(topVccTrace(json)).toBeDefined();
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(result.unanchoredPortIds).toContain(pad.pcb_port_id!);
});

test("a native via port needs an emitted barrel instead of coincident trace endpoints", () => {
  const json = structuredClone(nativeJson);
  const via = json.filter((element) => element.type === "pcb_via").find((element) => element.x === 2)!;
  json.splice(json.indexOf(via), 1);
  const result = auditPhysicalCopperConnectivity(json);
  expect(result.pass).toBe(false);
  expect(via.pcb_port_ids?.length).toBeGreaterThan(0);
  for (const portId of via.pcb_port_ids ?? []) expect(result.unanchoredPortIds).toContain(portId);
});
