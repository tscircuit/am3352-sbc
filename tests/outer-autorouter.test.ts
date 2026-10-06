import { expect, test } from "bun:test";
import { Circuit, type SimpleRouteJson, type SimplifiedPcbTrace } from "@tscircuit/core";
import { createElement as h } from "react";
import { outerAutorouter } from "../design/outer-autorouter";
import { filterUnchangedPreloadedTraces, fixedConnectionComponents, outerSignalConnections, PHYSICAL_STACK, validateOuterRoutes, type OuterRoutingConnection } from "../design/outer-route-validation";

function input(): SimpleRouteJson & { connections: OuterRoutingConnection[] } {
  return {
    layerCount: 4, allowBlindAndBuriedVias: false, minTraceWidth: 0.1,
    minViaPadDiameter: 0.3, minViaHoleDiameter: 0.15, defaultObstacleMargin: 0.1,
    minBoardEdgeClearance: 0.2,
    bounds: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
    outline: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }],
    obstacles: ["inner1", "inner2"].map(layer => ({
      type: "rect", layers: [layer], center: { x: 0, y: 0 }, width: 10, height: 10,
      isCopperPour: true, connectedTo: ["GROUND"],
    })),
    connections: [{ name: "DATA", pointsToConnect: [{ x: -3, y: 0, layer: "top" }, { x: 3, y: 0, layer: "top" }] }],
  };
}
function track(name: string, points: { x: number; y: number; layer?: string }[], id = name): SimplifiedPcbTrace {
  return { type: "pcb_trace", pcb_trace_id: id, connection_name: name,
    route: points.map(point => ({ route_type: "wire", ...point, layer: point.layer ?? "top", width: 0.1 })) };
}
function crossing(name = "DATA"): SimplifiedPcbTrace {
  return { type: "pcb_trace", pcb_trace_id: name, connection_name: name, route: [
    { route_type: "wire", x: -3, y: 0, layer: "top", width: 0.1 },
    { route_type: "wire", x: -2, y: 0, layer: "top", width: 0.1 },
    { route_type: "via", x: -2, y: 0, from_layer: "top", to_layer: "bottom", via_diameter: 0.3, via_hole_diameter: 0.15 },
    { route_type: "wire", x: -2, y: 0, layer: "bottom", width: 0.1 },
    { route_type: "wire", x: 2, y: 0, layer: "bottom", width: 0.1 },
    { route_type: "via", x: 2, y: 0, from_layer: "bottom", to_layer: "top", via_diameter: 0.3, via_hole_diameter: 0.15 },
    { route_type: "wire", x: 2, y: 0, layer: "top", width: 0.1 },
    { route_type: "wire", x: 3, y: 0, layer: "top", width: 0.1 },
  ] };
}

test("actual four-layer public pipeline routes across a top wall while retaining inner reservations", async () => {
  const native = input();
  native.minTraceToPadEdgeClearance = 0.1;
  delete native.defaultObstacleMargin;
  native.obstacles.push({ type: "rect", layers: ["top"], center: { x: 0, y: 0 }, width: 0.5, height: 10, connectedTo: [] });
  const original = JSON.stringify(native);
  const router = await outerAutorouter(native, { solverOptions: { capacityDepth: 5, effort: 0.1 }, maxIterations: 100000 });
  const output = await new Promise<SimplifiedPcbTrace[]>((resolve, reject) => {
    router.on("complete", event => resolve(event.traces));
    router.on("error", event => reject(event.error));
    router.start();
  });
  expect(output.length).toBeGreaterThan(0);
  expect(output.flatMap(trace => trace.route).filter(point => point.route_type === "via").length).toBeGreaterThanOrEqual(2);
  for (const point of output.flatMap(trace => trace.route)) {
    if (point.route_type === "wire") expect(["top", "bottom"]).toContain(point.layer);
    if (point.route_type === "via") expect(point.layers).toEqual([...PHYSICAL_STACK]);
  }
  expect(router.solver.originalSrj.layerCount).toBe(4);
  expect(router.solver.originalSrj.defaultObstacleMargin).toBe(0.1);
  expect((router.solver.originalSrj.connections[0]! as OuterRoutingConnection).allowedLayers).toEqual(["top", "bottom"]);
  for (const reservation of native.obstacles.filter(obstacle => obstacle.isCopperPour))
    expect(router.solver.originalSrj.obstacles).toContainEqual(expect.objectContaining(reservation));
  expect(router.getOutputSimpleRouteJson()?.layerCount).toBe(4);
  expect(JSON.stringify(native)).toBe(original);
}, 30000);

test("outer signal restrictions preserve ground plane access and narrower source intent", () => {
  const native = input();
  native.connections[0]!.allowedLayers = ["top", "inner1"];
  native.connections.push({ name: "GROUND", allowedLayers: ["inner1", "inner2"], pointsToConnect: [
    { x: -3, y: 3, layer: "inner1" }, { x: 3, y: 3, layer: "inner2" },
  ] });
  const original = JSON.stringify(native);
  const planned = outerSignalConnections(native);
  expect(planned[0]!.allowedLayers).toEqual(["top"]);
  expect(planned[1]!.allowedLayers).toEqual(["inner1", "inner2"]);
  expect(JSON.stringify(native)).toBe(original);
  native.connections[0]!.allowedLayers = ["inner1"];
  expect(() => outerSignalConnections(native)).toThrow("Signal DATA has no permitted outer copper layer");
});

test("native unbroken ground planes produce signal antipads and full manufactured vias", async () => {
  const circuit = new Circuit();
  circuit.schematicDisabled = true;
  circuit._featurePcbViaStitching = false;
  circuit.add(h("board", {
    width: 10, height: 10, outline: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }], layers: 4, allowBlindAndBuriedVias: false,
    minTraceWidth: 0.1, minViaHoleDiameter: 0.15, minViaPadDiameter: 0.3,
    minBoardEdgeClearance: 0.2, fanoutRoutingLayers: ["top", "bottom"],
    fanoutPourNetMap: { inner1: ["GND"] },
    autorouter: { local: true, algorithmFn: (srj: SimpleRouteJson) => outerAutorouter(srj, { solverOptions: { capacityDepth: 5, effort: 0.1 }, maxIterations: 100000 }) },
  },
    ...[[-3, 0, "DATA"], [3, 0, "DATA"], [-3, 3, "GND"], [3, 3, "GND"]].map(([x, y, net], index) => h("testpoint", {
      name: `TP${index + 1}`, pcbX: x, pcbY: y, footprintVariant: "pad", padDiameter: 0.3, doNotPlace: true, connections: { pin1: `net.${net}` },
    })),
    h("keepout", { shape: "rect", width: 0.5, height: 10, pcbX: 0, pcbY: 0, layers: ["top"] }),
    ...["inner1", "inner2"].map(layer => h("copperpour", { layer, connectsTo: "net.GND", unbroken: true, clearance: 0.13, boardEdgeMargin: 0.2 })),
  ));
  await circuit.renderUntilSettled();
  const native = circuit.getCircuitJson();
  expect(native.filter(element => element.type.endsWith("error"))).toEqual([]);
  const vias = native.filter(element => element.type === "pcb_via");
  expect(vias.length).toBeGreaterThanOrEqual(4);
  for (const via of vias) {
    expect(via.layers).toEqual([...PHYSICAL_STACK]);
    expect(via.outer_diameter).toBe(0.3);
    expect(via.hole_diameter).toBe(0.15);
  }
  const planes = native.filter(element => element.type === "pcb_copper_pour");
  expect(planes.map(plane => plane.layer).sort()).toEqual(["inner1", "inner2"]);
  for (const plane of planes) {
    expect(plane.shape).toBe("brep");
    if (plane.shape !== "brep") throw new Error("Native unbroken plane did not produce physical copper");
    expect(plane.brep_shape.outer_ring.vertices.length).toBeGreaterThan(0);
    expect(plane.brep_shape.inner_rings?.length).toBeGreaterThanOrEqual(2);
  }
}, 30000);

test("multipoint acceptance checks physical connectivity rather than one route per connection", () => {
  const native = input();
  native.connections[0].pointsToConnect.push({ x: 3, y: 2, layer: "top" });
  const trunk = track("DATA", [{ x: -3, y: 0 }, { x: 3, y: 0 }], "trunk");
  expect(() => validateOuterRoutes(native, [trunk])).toThrow("unrouted native terminal");
  const branch = track("DATA", [{ x: 3, y: 0 }, { x: 3, y: 2 }], "branch");
  expect(validateOuterRoutes(native, [trunk, branch])).toHaveLength(2);
  const detached = track("DATA", [{ x: 3, y: 1 }, { x: 3, y: 2 }], "detached");
  expect(() => validateOuterRoutes(native, [trunk, detached])).toThrow("partially routed");
});

test("fixed terminal components reuse native multipoint copper and report its actual extent", () => {
  const native = input();
  native.connections[0].pointsToConnect.push({ x: 3, y: 2, layer: "top" });
  native.obstacles.push(...native.connections[0].pointsToConnect.map((point, index) => ({
    type: "rect" as const, shape: "circle" as const, center: point, width: .3, height: .3, layers: [point.layer],
    connectedTo: ["DATA"], circuitJsonMetadata: { pcb_smtpad_id: `pad_${index}`, pcb_port_id: `port_${index}` },
  })));
  native.traces = [track("DATA", [{ x: -3, y: 0 }, { x: 3, y: 0 }], "native-lcd-trunk")];
  const original = JSON.stringify(native);
  const [report] = fixedConnectionComponents(native);
  expect(report!.groups).toEqual([[0, 1], [2]]);
  expect(report!.uncontactedTerminals).toEqual([]);
  expect(report!.components[0]).toMatchObject({ traceIds: ["native-lcd-trunk"], layers: ["top"],
    traceBounds: { minX: -3.05, maxX: 3.05, minY: -.05, maxY: .05 } });
  expect(report!.components[1]!.traceIds).toEqual([]);
  expect(report!.components[1]!.traceBounds).toBeUndefined();
  expect(JSON.stringify(native)).toBe(original);
});

test("fixed fragments join by copper contact while detached and raster-only claims do not", () => {
  const native = input();
  const trunk = track("DATA", [{ x: -3, y: 0 }, { x: 1, y: 0 }], "native-prefix");
  const carrier = track("DATA", [{ x: 0, y: .043 }, { x: 0, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 0 }], "native-carrier");
  native.traces = [trunk, carrier];
  expect(fixedConnectionComponents(native)[0]!.groups).toEqual([[0, 1]]);
  expect(fixedConnectionComponents(native)[0]!.components[0]!.traceIds).toEqual(["native-prefix", "native-carrier"]);
  carrier.route[0] = { route_type: "wire", x: 0, y: .101, layer: "top", width: .1 };
  expect(fixedConnectionComponents(native)[0]!.groups).toEqual([[0], [1]]);
  native.obstacles.push({ type: "rect", center: { x: 0, y: 0 }, width: 6.1, height: .4, layers: ["top"], connectedTo: ["DATA"] });
  expect(fixedConnectionComponents(native)[0]!.groups).toEqual([[0], [1]]);
  const detached = input();
  detached.traces = [track("DATA", [{ x: -2, y: 0 }, { x: 2, y: 0 }])];
  expect(fixedConnectionComponents(detached)[0]!.uncontactedTerminals).toEqual([0, 1]);
});

test("fixed component contact respects manufactured layers and native circular pad shape", () => {
  const native = input();
  native.connections[0].pointsToConnect = [{ x: -3, y: 0, layer: "top" }, { x: 3, y: 0, layer: "bottom" }];
  native.traces = [{ type: "pcb_trace", pcb_trace_id: "native-barrel-path", connection_name: "DATA", route: [
    { route_type: "wire", x: -3, y: 0, layer: "top", width: .1 },
    { route_type: "wire", x: 0, y: 0, layer: "top", width: .1 },
    { route_type: "via", x: 0, y: 0, from_layer: "top", to_layer: "bottom", layers: [...PHYSICAL_STACK], via_diameter: .3, via_hole_diameter: .15 },
    { route_type: "wire", x: 0, y: 0, layer: "bottom", width: .1 },
    { route_type: "wire", x: 3, y: 0, layer: "bottom", width: .1 },
  ] }];
  expect(fixedConnectionComponents(native)[0]!.groups).toEqual([[0, 1]]);
  native.connections[0].pointsToConnect[1]!.layer = "top";
  expect(fixedConnectionComponents(native)[0]!.uncontactedTerminals).toEqual([1]);
  const pad = input();
  pad.connections[0].pointsToConnect = [{ x: 0, y: 0, layer: "top" }, { x: .49, y: .49, layer: "top" }];
  pad.obstacles.push({ type: "rect", shape: "circle", center: { x: 0, y: 0 }, width: 1, height: 1,
    layers: ["top"], connectedTo: ["DATA"], circuitJsonMetadata: { pcb_smtpad_id: "round-pad" } });
  expect(fixedConnectionComponents(pad)[0]!.groups).toEqual([[0]]);
  expect(fixedConnectionComponents(pad)[0]!.uncontactedTerminals).toEqual([1]);
});

test("preloaded replacement records cannot change fixed geometry or ownership", () => {
  const native = input();
  const fixed = track("POWER", [{ x: -3, y: 3 }, { x: 3, y: 3 }], "fixed");
  native.traces = [fixed];
  const repeat = { ...structuredClone(fixed), pcb_trace_id: "repeat", __replaces_pcb_trace_id: "fixed" };
  expect(filterUnchangedPreloadedTraces(native, [repeat])).toEqual([]);
  expect(native.traces[0]).toBe(fixed);
  repeat.route[0] = { route_type: "wire", x: -2, y: 3, layer: "top", width: 0.1 };
  expect(() => filterUnchangedPreloadedTraces(native, [repeat])).toThrow("changed supplied trace");
  expect(() => filterUnchangedPreloadedTraces(native, [{ ...fixed, connection_name: "OTHER" }])).toThrow("changed supplied trace");
  expect(() => filterUnchangedPreloadedTraces(native, [{ ...fixed, __replaces_pcb_trace_id: "missing" }])).toThrow("Unknown supplied trace");
});

test("planning compacts repeated unused aliases while retaining original fixed copper and pour geometry", async () => {
  const native = input();
  const aliases = Array.from({ length: 2000 }, (_, index) => `pcb_port_unused_${index}`);
  for (const obstacle of native.obstacles) obstacle.connectedTo.push(...aliases);
  const fixed = track("POWER", [{ x: -3, y: 3 }, { x: 3, y: 3 }], "fixed-power");
  native.traces = [fixed];
  native.obstacles.push({ type: "rect", center: { x: -3, y: 3 }, width: 0.3, height: 0.3, layers: ["top"],
    connectedTo: ["POWER", "pcb_port_power", ...aliases.map(alias => `${alias}_power`)], circuitJsonMetadata: { pcb_port_id: "pcb_port_power" } });
  native.obstacles.push({ type: "rect", center: { x: 0, y: -3 }, width: 0.5, height: 0.5, layers: [...PHYSICAL_STACK],
    connectedTo: ["source_net_barrel", "pcb_plated_hole_barrel", ...aliases.map(alias => `${alias}_barrel`)],
    circuitJsonMetadata: { pcb_plated_hole_id: "pcb_plated_hole_barrel" } });
  const original = JSON.stringify(native);
  const router = await outerAutorouter(native, { maxIterations: 0 });
  expect(router.input).toBe(native);
  expect(router.input.traces![0]).toBe(fixed);
  expect(JSON.stringify(router.solver.originalSrj.traces)).toBe(JSON.stringify([fixed]));
  expect((router.solver.opts as { immutablePreloadedTraceIds?: readonly string[] }).immutablePreloadedTraceIds).toEqual(["fixed-power"]);
  expect(router.solver.originalSrj.obstacles[0]!.connectedTo).toEqual(["GROUND"]);
  expect(router.solver.originalSrj.obstacles[2]!.connectedTo).toEqual(["POWER", "pcb_port_power"]);
  expect(router.solver.originalSrj.obstacles[3]!.connectedTo).toEqual(["source_net_barrel", "pcb_plated_hole_barrel"]);
  for (let index = 0; index < native.obstacles.length; index++) {
    const { connectedTo: originalAliases, ...geometry } = native.obstacles[index]!;
    const { connectedTo: plannerAliases, zLayers, __zLayers, ...plannedGeometry } = router.solver.originalSrj.obstacles[index]!;
    expect(plannedGeometry).toEqual(geometry);
    expect(zLayers).toEqual(geometry.layers.map(layer => PHYSICAL_STACK.indexOf(layer as typeof PHYSICAL_STACK[number])));
    expect(__zLayers).toEqual(zLayers);
  }
  expect(JSON.stringify(native)).toBe(original);
});

test("inner signals, false manufactured spans, wrong directions, and overlapping drills fail closed", () => {
  const native = input();
  expect(() => validateOuterRoutes(native, [track("DATA", [{ x: -3, y: 0, layer: "inner1" }, { x: 3, y: 0, layer: "inner1" }])])).toThrow("inner-layer signal");
  const route = crossing();
  expect(validateOuterRoutes(native, [route])[0].route[2]).toMatchObject({ layers: [...PHYSICAL_STACK] });
  const incomplete = structuredClone(route);
  (incomplete.route[2] as any).layers = ["top", "bottom"];
  expect(() => validateOuterRoutes(native, [incomplete])).toThrow("manufactured through via");
  const backwards = structuredClone(route);
  (backwards.route[2] as any).from_layer = "bottom";
  (backwards.route[2] as any).to_layer = "top";
  expect(() => validateOuterRoutes(native, [backwards])).toThrow("incoming via handoff");
  native.traces = [{ type: "pcb_trace", pcb_trace_id: "same-net-drill", connection_name: "DATA", route: [
    { route_type: "wire", x: -2.1, y: 0, layer: "top", width: 0.1 },
    { route_type: "via", x: -2.1, y: 0, from_layer: "top", to_layer: "bottom", via_diameter: 0.3, via_hole_diameter: 0.15 },
  ] }];
  expect(() => validateOuterRoutes(native, [route])).toThrow("Via drill collision");
});

test("different native nets cannot be joined by an output ownership claim", () => {
  const native = input();
  native.connections.push({ name: "CONTROL", pointsToConnect: [{ x: -3, y: 3, layer: "top", pcb_port_id: "control-a" }, { x: 3, y: 3, layer: "top", pcb_port_id: "control-b" }] });
  const forged = { ...track("DATA", [{ x: -3, y: 0 }, { x: 3, y: 0 }]), connectsTo: ["control-a"] };
  expect(() => validateOuterRoutes(native, [forged])).toThrow("different native nets");
});

test("native oval pads prove circular contact and reserve unknown connector drills", () => {
  const native = input();
  native.connections[0].pointsToConnect = [{ x: 0, y: 0, layer: "top" }, { x: 2, y: 2, layer: "top" }];
  native.obstacles.push({ type: "oval" as "rect", layers: ["top", "bottom"], center: { x: 0, y: 0 }, width: 1, height: 1,
    connectedTo: ["DATA"], circuitJsonMetadata: { pcb_plated_hole_id: "connector-hole" } });
  const open = track("DATA", [{ x: 0.49, y: 0.49 }, { x: 2, y: 2 }]);
  expect(() => validateOuterRoutes(native, [open])).toThrow("partially routed");
  expect(validateOuterRoutes(native, [track("DATA", [{ x: 0, y: 0 }, { x: 2, y: 2 }])])).toHaveLength(1);
  const drilled = input();
  drilled.obstacles.push({ type: "oval" as "rect", layers: [...PHYSICAL_STACK], center: { x: -2.4, y: 0 }, width: 1, height: 1,
    connectedTo: ["DATA"], circuitJsonMetadata: { pcb_plated_hole_id: "native-large-drill" } });
  expect(() => validateOuterRoutes(drilled, [crossing()])).toThrow("native drill");
});

test("touching native ground tiles remain one physically connected plane", () => {
  const native = input();
  native.connections = [{ name: "GROUND", pointsToConnect: [{ x: -1, y: 0, layer: "inner1" }, { x: 1, y: 0, layer: "inner1" }] }];
  native.obstacles = ["inner1", "inner2"].flatMap(layer => [-1, 1].map(x => ({ type: "rect" as const, layers: [layer],
    center: { x, y: 0 }, width: 2, height: 2, isCopperPour: true, connectedTo: ["GROUND"] })));
  expect(validateOuterRoutes(native, [])).toEqual([]);
  native.obstacles[1].center.x = 1.1;
  native.obstacles[3].center.x = 1.1;
  expect(() => validateOuterRoutes(native, [])).toThrow("partially routed");
});

test("native fabrication minima and finite through-pad widths are mandatory", () => {
  const native = input();
  native.minViaPadDiameter = 0.6;
  native.minViaHoleDiameter = 0.3;
  expect(() => validateOuterRoutes(native, [crossing()])).toThrow("manufactured through via");
  const throughInput = input();
  throughInput.obstacles.push({ type: "oval" as "rect", layers: [...PHYSICAL_STACK], center: { x: 0, y: 2 }, width: 1, height: 1,
    connectedTo: ["DATA"], circuitJsonMetadata: { pcb_plated_hole_id: "data-pad" } });
  for (const width of [NaN, -1]) {
    const invalid: SimplifiedPcbTrace = { type: "pcb_trace", pcb_trace_id: "invalid-pad", connection_name: "DATA", route: [
      { route_type: "through_obstacle", start: { x: 0, y: 2 }, end: { x: 0, y: 2 }, from_layer: "top", to_layer: "bottom", width,
        circuitJsonMetadata: { pcb_plated_hole_id: "data-pad" } },
    ] };
    expect(() => validateOuterRoutes(throughInput, [track("DATA", [{ x: -3, y: 0 }, { x: 3, y: 0 }]), invalid])).toThrow("plated-pad handoff");
  }
});

test("a native signal plated barrel can cross ground reservations without creating another drill", () => {
  const native = input();
  native.connections[0].pointsToConnect[1].layer = "bottom";
  native.obstacles.push({ type: "oval" as "rect", layers: [...PHYSICAL_STACK], center: { x: 0, y: 0 }, width: 0.6, height: 0.6,
    connectedTo: ["DATA"], circuitJsonMetadata: { pcb_plated_hole_id: "native-signal-barrel" } });
  const route: SimplifiedPcbTrace = { type: "pcb_trace", pcb_trace_id: "native-through", connection_name: "DATA", route: [
    { route_type: "wire", x: -3, y: 0, layer: "top", width: 0.1 },
    { route_type: "wire", x: -0.2, y: 0, layer: "top", width: 0.1 },
    { route_type: "through_obstacle", start: { x: -0.2, y: 0 }, end: { x: 0.2, y: 0 }, from_layer: "top", to_layer: "bottom", width: 0.1,
      circuitJsonMetadata: { pcb_plated_hole_id: "native-signal-barrel" } },
    { route_type: "wire", x: 0.2, y: 0, layer: "bottom", width: 0.1 },
    { route_type: "wire", x: 3, y: 0, layer: "bottom", width: 0.1 },
  ] };
  expect(validateOuterRoutes(native, [route])).toHaveLength(1);
  native.obstacles[native.obstacles.length - 1].connectedTo = ["GROUND"];
  expect(() => validateOuterRoutes(native, [route])).toThrow("plated-pad handoff");
});

test("cancellation and iteration bounds never report a partial solution complete", async () => {
  const native = input();
  const router = await outerAutorouter(native, { maxIterations: 0 });
  let complete = false;
  const failed = new Promise<Error>(resolve => router.on("error", event => resolve(event.error)));
  router.on("complete", () => { complete = true; });
  router.start();
  expect((await failed).message).toContain("exceeded 0 iterations");
  expect(complete).toBe(false);
  expect(router.getOutputSimpleRouteJson()).toBeUndefined();
  const cancelled = await outerAutorouter(native, { timeSliceMilliseconds: 1 });
  cancelled.on("progress", () => cancelled.stop());
  cancelled.on("complete", () => { complete = true; });
  await cancelled.start();
  expect(cancelled.isRouting).toBe(false);
  expect(complete).toBe(false);
  expect(cancelled.getOutputSimpleRouteJson()).toBeUndefined();
});
