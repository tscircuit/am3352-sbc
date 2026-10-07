import { beforeAll, expect, test } from "bun:test";
import { RootCircuit } from "@tscircuit/core";
import type { AnyCircuitElement } from "circuit-json";
import { auditRoutedBoard } from "../scripts/audit-routed-board";

let nativeJson: AnyCircuitElement[];
beforeAll(async () => {
  const circuit = new RootCircuit();
  circuit.schematicDisabled = true;
  const noRoutes = async () => {
    let complete: ((event: { traces: [] }) => void) | undefined;
    return { on(event: string, handler: typeof complete) { if (event === "complete") complete = handler; }, start() { complete?.({ traces: [] }); }, stop() {} };
  };
  circuit.add(<board width={10} height={8} layers={4} minTraceWidth={0.1}
    minViaPadDiameter={0.3} minViaHoleDiameter={0.15} autorouter={{ algorithmFn: noRoutes }}>
    <net name="GND" /><net name="VCC" />
    {[
      { name: "GT", net: "GND", x: -3, y: 2, layer: "top" as const },
      { name: "GB", net: "GND", x: -3, y: -2, layer: "bottom" as const },
      { name: "VT", net: "VCC", x: 3, y: 2, layer: "top" as const },
      { name: "VB", net: "VCC", x: 3, y: -2, layer: "bottom" as const },
    ].map(pad => <chip key={pad.name} name={pad.name} pcbX={pad.x} pcbY={pad.y} layer={pad.layer}
      pinLabels={{ pin1: pad.net }} connections={{ pin1: `net.${pad.net}` }}
      footprint={<footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0} shape="rect" width={0.7} height={0.7} /></footprint>} />)}
    <via name="VG" pcbX={-1} fromLayer="top" toLayer="bottom" holeDiameter={0.15} outerDiameter={0.3} connectsTo="net.GND" />
    <via name="VV" pcbX={2} fromLayer="top" toLayer="bottom" holeDiameter={0.15} outerDiameter={0.3} connectsTo="net.VCC" />
    <trace from="GT.pin1" to="VG.top" pcbStraightLine thickness={0.1} />
    <trace from="GB.pin1" to="VG.bottom" pcbStraightLine thickness={0.1} />
    <trace from="VT.pin1" to="VV.top" pcbStraightLine thickness={0.1} />
    <trace from="VB.pin1" to="VV.bottom" pcbStraightLine thickness={0.1} />
    {(["inner1", "inner2"] as const).map(layer => <copperpour key={layer} layer={layer} connectsTo="net.GND"
      unbroken coveredWithSolderMask clearance={0.2} boardEdgeMargin={0.3} />)}
  </board>);
  await circuit.renderUntilSettled();
  nativeJson = circuit.getCircuitJson();
});

test("native connected copper passes physical gates while missing board timing cohorts fail closed", async () => {
  const before = JSON.stringify(nativeJson);
  const report = await auditRoutedBoard(nativeJson);
  expect(report.nativeErrorCounts).toEqual({});
  expect(report.routingChecksComplete).toBe(true);
  expect(report.recomputedRoutingErrorCounts).toEqual({});
  expect(report.physicalConnectivity.failures).toEqual([]);
  expect(report.physicalConnectivity.pass).toBe(true);
  expect(report.innerGroundPlanes.pass).toBe(true);
  expect(report.vias.pass).toBe(true);
  expect(report.signalLayers.pass).toBe(true);
  expect(report.ddr.pass).toBe(false);
  expect(report.peripheral.pass).toBe(false);
  expect(report.pass).toBe(false);
  expect(JSON.stringify(nativeJson)).toBe(before);
});

test("native runtime and missing-trace errors can never be waived by checkpoint metadata", async () => {
  const json = structuredClone(nativeJson);
  json.push({ type: "source_runtime_error", source_runtime_error_id: "runtime", message: "failed router" } as AnyCircuitElement);
  json.push({ type: "pcb_trace_missing_error", pcb_trace_missing_error_id: "missing", message: "missing connection" } as AnyCircuitElement);
  const report = await auditRoutedBoard(json);
  expect(report.pass).toBe(false);
  expect(report.nativeErrorCounts).toMatchObject({ source_runtime_error: 1, pcb_trace_missing_error: 1 });
});

test("fresh native checks and physical contacts reject a deleted branch even without stored errors", async () => {
  const json = structuredClone(nativeJson);
  const index = json.findIndex(e => e.type === "pcb_trace" && e.route.some(point => point.route_type === "wire" && point.x === 3 && point.y === 2));
  expect(index).toBeGreaterThanOrEqual(0);
  json.splice(index, 1);
  const report = await auditRoutedBoard(json);
  expect(report.nativeErrorCounts).toEqual({});
  expect(report.recomputedRoutingErrorCounts.pcb_port_not_connected_error).toBeGreaterThan(0);
  expect(report.physicalConnectivity.pass).toBe(false);
  expect(report.physicalConnectivity.disconnectedPortGroups.some(group => group.labels.includes("VCC"))).toBe(true);
});

test("a non-GND inner segment and an incomplete barrel each block final export", async () => {
  const json = structuredClone(nativeJson);
  const trace = json.filter(e => e.type === "pcb_trace").find(e => e.route.some(point => point.route_type === "wire" && point.x === 3 && point.y === 2))!;
  for (const point of trace.route) if (point.route_type === "wire") point.layer = "inner1";
  const via = json.filter(e => e.type === "pcb_via").find(e => e.x === 2)!;
  via.layers = ["top", "bottom"];
  const report = await auditRoutedBoard(json);
  expect(report.pass).toBe(false);
  expect(report.signalLayers.foreignInnerSegments.length).toBeGreaterThan(0);
  expect(report.vias.incompleteViaSpans).toContain(via.pcb_via_id);
  expect(report.innerGroundPlanes.incompleteViaSpans).toContain(via.pcb_via_id);
});
