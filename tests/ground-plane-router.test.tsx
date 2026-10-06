import { expect, test } from "bun:test";
import { Circuit, type SimpleRouteJson, type SimplifiedPcbTrace } from "@tscircuit/core";
import { createGroundPlaneAutorouter, groundPlaneAutorouter } from "../design/ground-plane-router";
import { PHYSICAL_STACK } from "../design/outer-route-validation";
import { auditInnerGroundPlanes } from "../scripts/inner-ground-plane-audit";
import { checkEachPcbPortConnectedToPcbTraces } from "@tscircuit/checks";

function input(offset = 0): SimpleRouteJson {
  const pad = { x: offset - 2, y: offset };
  const barrel = { x: offset, y: offset };
  return {
    layerCount: 4, allowBlindAndBuriedVias: false, minTraceWidth: 0.1,
    bounds: { minX: offset - 5, maxX: offset + 5, minY: offset - 5, maxY: offset + 5 },
    minViaPadDiameter: 0.3, minViaHoleDiameter: 0.15,
    connections: [{ name: "GND", pointsToConnect: [
      { ...pad, layer: "top", pcb_port_id: "pad-port", pointId: "pad-port" },
      { ...barrel, layer: "top", pcb_port_id: "barrel-top", pointId: "barrel-top" },
    ] }],
    obstacles: [
      ...["inner1", "inner2"].map(layer => ({ type: "rect" as const, layers: [layer],
        center: barrel, width: 9, height: 9, isCopperPour: true, connectedTo: ["GND"] })),
      { type: "rect", layers: ["top"], center: pad, width: 0.6, height: 0.6,
        connectedTo: ["GND", "pad-port"], circuitJsonMetadata: { pcb_smtpad_id: "pad", pcb_port_id: "pad-port" } },
      { type: "rect", shape: "circle", layers: [...PHYSICAL_STACK], center: barrel, width: 0.3, height: 0.3,
        connectedTo: ["GND", "barrel-top"], circuitJsonMetadata: { pcb_via_id: "barrel" } },
    ],
    traces: [{ type: "pcb_trace", pcb_trace_id: "fixed", connection_name: "GND", route: [
      { route_type: "wire", ...pad, layer: "top", width: 0.15 },
      { route_type: "wire", ...barrel, layer: "top", width: 0.15 },
      { route_type: "via", ...barrel, from_layer: "top", to_layer: "bottom", layers: [...PHYSICAL_STACK],
        via_diameter: 0.3, via_hole_diameter: 0.15 },
      { route_type: "wire", ...barrel, layer: "bottom", width: 0.15 },
    ] }],
  };
}

test.each([0, 31.75])("defers GND to authored pours and preserves translated native copper at %s", async offset => {
  const native = input(offset), before = JSON.stringify(native);
  const router = await groundPlaneAutorouter(native);
  expect(router.requiresPostRenderGroundPlaneAudit).toBe(true);
  expect(router.groundPointCount).toBe(2);
  expect(router.getOutputSimpleRouteJson()).toBeUndefined();
  const output = await new Promise<SimplifiedPcbTrace[]>((resolve, reject) => {
    router.on("complete", event => resolve(event.traces)); router.on("error", event => reject(event.error)); router.start();
  });
  expect(output).toEqual([]);
  expect(router.getOutputSimplifiedPcbTraces()).toEqual([]);
  expect(router.getOutputSimpleRouteJson()?.traces).toEqual(native.traces);
  expect(JSON.stringify(native)).toBe(before);
  expect(() => router.solveSync()).toThrow("only be started once");
});

test("rejects signal owners, missing or foreign planes and invalid physical stacks", () => {
  const signal = input(); signal.connections[0]!.name = "SIGNAL";
  expect(() => createGroundPlaneAutorouter(signal)).toThrow("non-ground");
  const missing = input(); missing.obstacles.splice(1, 1);
  expect(() => createGroundPlaneAutorouter(missing)).toThrow("Both inner layers");
  const foreign = input(); foreign.obstacles[1]!.connectedTo = ["VCC"];
  expect(() => createGroundPlaneAutorouter(foreign)).toThrow("Both inner layers");
  const extraForeign = input(); extraForeign.obstacles.push({ type: "rect", layers: ["inner1"],
    center: { x: 3, y: 3 }, width: 1, height: 1, isCopperPour: true, connectedTo: ["VCC"] });
  expect(() => createGroundPlaneAutorouter(extraForeign)).toThrow("foreign owner");
  const twoOwners = input(); twoOwners.obstacles.push(...["inner1", "inner2"].map(layer => ({ type: "rect" as const,
    layers: [layer], center: { x: 3, y: 3 }, width: 1, height: 1, isCopperPour: true, connectedTo: ["VCC"] })));
  expect(() => createGroundPlaneAutorouter(twoOwners)).toThrow("one ground owner");
  const two = input(); two.layerCount = 2;
  expect(() => createGroundPlaneAutorouter(two)).toThrow("actual four-layer");
  const blind = input(); blind.allowBlindAndBuriedVias = true;
  expect(() => createGroundPlaneAutorouter(blind)).toThrow("through vias");
  const unknown = input(); unknown.connections[0]!.pointsToConnect[0]!.layer = "inner3";
  expect(() => createGroundPlaneAutorouter(unknown)).toThrow("invalid physical terminal");
});

test("requires exact native pad or barrel anchors and complete physical barrel spans", () => {
  const unanchored = input(); unanchored.connections[0]!.pointsToConnect[0]!.x += 0.05;
  expect(() => createGroundPlaneAutorouter(unanchored)).toThrow("unanchored native terminal");
  const forged = input(); forged.connections[0]!.pointsToConnect[0]!.pcb_port_id = "forged";
  forged.connections[0]!.pointsToConnect[0]!.pointId = "forged";
  expect(() => createGroundPlaneAutorouter(forged)).toThrow("unanchored native terminal");
  const native = input(); native.obstacles[3]!.layers = ["top", "bottom"];
  expect(() => createGroundPlaneAutorouter(native)).toThrow("full-stack native barrels");
  const preloaded = input(); const via = preloaded.traces![0]!.route.find(point => point.route_type === "via")!;
  if (via.route_type !== "via") throw new Error("Missing via fixture");
  via.layers = ["top", "bottom"];
  expect(() => createGroundPlaneAutorouter(preloaded)).toThrow("full-stack preloaded vias");
});

test("rejects preloaded inner signal copper and input changes after construction", () => {
  const foreign = input(); foreign.traces!.push({ type: "pcb_trace", pcb_trace_id: "foreign", connection_name: "DATA", route: [
    { route_type: "wire", x: 1, y: 1, layer: "inner1", width: 0.1 },
    { route_type: "wire", x: 2, y: 1, layer: "inner1", width: 0.1 },
  ] });
  expect(() => createGroundPlaneAutorouter(foreign)).toThrow("non-ground wire");
  const native = input(); const router = createGroundPlaneAutorouter(native);
  native.traces![0]!.route[0]!.x += 0.01;
  expect(() => router.solveSync()).toThrow("Native ground input changed");
});

test("the native renderer completes deferred GND through actual surface and inner pours", async () => {
  const circuit = new Circuit(); circuit.schematicDisabled = true;
  let nativePhases = 0;
  circuit.add(<board width={10} height={8} layers={4} allowBlindAndBuriedVias={false}
    minTraceWidth={0.1} minViaPadDiameter={0.3} minViaHoleDiameter={0.15}
    autorouter={{ local: true, algorithmFn: async native => { nativePhases++; return groundPlaneAutorouter(native); } }}>
    <net name="GND" />
    <chip name="JTOP" pcbX={-2} pinLabels={{ pin1: "GND" }} connections={{ pin1: "net.GND" }}
      footprint={<footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0} shape="rect" width={0.7} height={0.7} /></footprint>} />
    <chip name="JBOTTOM" pcbX={2} pcbY={-2} layer="bottom" pinLabels={{ pin1: "GND" }} connections={{ pin1: "net.GND" }}
      footprint={<footprint><smtpad portHints={["1"]} pcbX={0} pcbY={0} shape="rect" width={0.7} height={0.7} /></footprint>} />
    <via name="VGND" pcbX={0} pcbY={0} fromLayer="top" toLayer="bottom" holeDiameter={0.15} outerDiameter={0.3} connectsTo="net.GND" />
    <trace from="JTOP.pin1" to="VGND.top" pcbStraightLine thickness={0.15} />
    <copperpour layer="bottom" connectsTo="net.GND" clearance={0.2} boardEdgeMargin={0.3} />
    {(["inner1", "inner2"] as const).map(layer => <copperpour key={layer} layer={layer} connectsTo="net.GND" unbroken coveredWithSolderMask clearance={0.2} boardEdgeMargin={0.3} />)}
  </board>);
  await circuit.renderUntilSettled();
  const json = circuit.getCircuitJson();
  expect(nativePhases).toBeGreaterThan(0);
  expect(json.filter(element => element.type === "source_runtime_error")).toEqual([]);
  const proof = auditInnerGroundPlanes(json);
  expect(proof.pass).toBe(true);
  expect(proof.failures).toEqual([]);
  expect(proof.disconnectedGroundPortIds).toEqual([]);
  expect(proof.innerPours).toHaveLength(2);
  expect(proof.groundBridgeViaIds.length).toBeGreaterThan(0);
  expect(await checkEachPcbPortConnectedToPcbTraces(structuredClone(json))).toEqual([]);
  // The callback emitted no route witness. Removing the actual surface pour
  // must fail the mandatory native completion gate rather than reuse its event.
  const disconnected = json.filter(element => element.type !== "pcb_copper_pour" || element.layer !== "bottom");
  const failed = auditInnerGroundPlanes(disconnected);
  expect(failed.pass).toBe(false);
  expect(failed.disconnectedGroundPortIds.length).toBeGreaterThan(0);
}, 30000);
