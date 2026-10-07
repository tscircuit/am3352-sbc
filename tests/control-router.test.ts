import { expect, test } from "bun:test";
import type { SimpleRouteJson, SimplifiedPcbTrace } from "@tscircuit/core";
import { controlAutorouter, createControlAutorouter, prepareControlSourceRouting } from "../design/control-router";
import { PHYSICAL_STACK, validateOuterRoutes } from "../design/outer-route-validation";

const nativeWire = (point: Extract<SimplifiedPcbTrace["route"][number], { route_type: "wire" }> & {
  start_pcb_port_id?: string; end_pcb_port_id?: string;
}) => point;

function nativeControlInput(): SimpleRouteJson {
  const sourceCoordinates = [{ x: -.8, y: -.8 }, { x: .8, y: -.8 }, { x: 0, y: 0 }];
  const connections = Array.from({ length: 3 }, (_, index) => {
    const source = { ...sourceCoordinates[index]!, layer: "top", pcb_port_id: `native-source-${index}` };
    const destination = { x: index === 0 ? -6 : 6, y: source.y, layer: "top", pcb_port_id: `native-destination-${index}` };
    const pointsToConnect = index % 2 ? [destination, source] : [source, destination];
    if (index === 1) pointsToConnect.push({ x: 7, y: 6, layer: "top", pcb_port_id: "native-boot-branch" });
    return { name: `arbitrary-signal-${index}`, source_trace_id: `native-trace-${index}`, pointsToConnect };
  });
  connections.push({ name: "connector-only", source_trace_id: "native-connector-only", pointsToConnect: [
    { x: -6, y: 5, layer: "top", pcb_port_id: "connector-a" },
    { x: -6, y: 7, layer: "top", pcb_port_id: "connector-b" },
  ] });
  const trace = (index: number): SimplifiedPcbTrace & { source_trace_id?: string } => ({ type: "pcb_trace", pcb_trace_id: `existing-display-${index}`,
    connection_name: connections[index]!.name, source_trace_id: connections[index]!.source_trace_id, route: [
      nativeWire({ route_type: "wire", ...sourceCoordinates[index]!, layer: "top", width: .1, start_pcb_port_id: `native-source-${index}` }),
      nativeWire({ route_type: "wire", x: index === 0 ? -6 : 6, y: sourceCoordinates[index]!.y, layer: "top", width: .1, end_pcb_port_id: `native-destination-${index}` }),
    ] });
  return { layerCount: 4, minTraceWidth: .1, minViaPadDiameter: .3, minViaHoleDiameter: .15,
    defaultObstacleMargin: .1, allowBlindAndBuriedVias: false, bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
    connections, traces: [trace(0), trace(1)], obstacles: [
      ...connections.flatMap((connection, connectionIndex) => connection.pointsToConnect.map(point => ({ type: "rect" as const,
        shape: "circle" as const, componentId: point.pcb_port_id?.startsWith("native-source-") ? "actual-processor" : `other-${connectionIndex}-${point.pcb_port_id}`,
        center: { x: point.x, y: point.y }, width: .4, height: .4, layers: ["top"], connectedTo: [connection.name, point.pcb_port_id!],
        circuitJsonMetadata: { pcb_port_id: point.pcb_port_id, pcb_smtpad_id: `pad-${point.pcb_port_id}` } }))),
      ...[-.8, 0, .8].flatMap(x => [-.8, 0, .8].filter(y => !sourceCoordinates.some(point => point.x === x && point.y === y))
        .map(y => ({ type: "rect" as const, shape: "circle" as const, componentId: "actual-processor", center: { x, y },
          width: .4, height: .4, layers: ["top"], connectedTo: [`unused-native-${x}-${y}`],
          circuitJsonMetadata: { pcb_port_id: `unused-native-${x}-${y}`, pcb_smtpad_id: `unused-pad-${x}-${y}` } }))),
      ...["inner1", "inner2"].map(layer => ({ type: "rect" as const, center: { x: 0, y: 0 }, width: 20, height: 20,
        layers: [layer], isCopperPour: true, connectedTo: ["actual-ground"] })),
      ...[-9, 9].flatMap(y => [-9, 9].map(x => ({ type: "rect" as const, shape: "circle" as const,
        center: { x, y }, width: .6, height: .6, layers: [...PHYSICAL_STACK], isNonPlatedHole: true, connectedTo: [] }))),
    ] };
}

function fullyWiredNativeControlInput(): SimpleRouteJson {
  const input = nativeControlInput();
  input.traces!.push({ type: "pcb_trace", pcb_trace_id: "native-boot-branch", connection_name: input.connections[1]!.name, route: [
    { route_type: "wire", x: 6, y: -.8, layer: "top", width: .1 },
    { route_type: "wire", x: 8, y: -.8, layer: "top", width: .1 },
    { route_type: "wire", x: 8, y: 6, layer: "top", width: .1 },
    { route_type: "wire", x: 7, y: 6, layer: "top", width: .1 },
  ] }, { type: "pcb_trace", pcb_trace_id: "native-center-bottom-path", connection_name: input.connections[2]!.name, route: [
    { route_type: "wire", x: 0, y: 0, layer: "top", width: .1 },
    { route_type: "wire", x: .4, y: .4, layer: "top", width: .1 },
    { route_type: "via", x: .4, y: .4, from_layer: "top", to_layer: "bottom", layers: [...PHYSICAL_STACK], via_diameter: .3, via_hole_diameter: .15 },
    { route_type: "wire", x: .4, y: .4, layer: "bottom", width: .1 },
    { route_type: "wire", x: 6, y: .4, layer: "bottom", width: .1 },
    { route_type: "via", x: 6, y: .4, from_layer: "bottom", to_layer: "top", layers: [...PHYSICAL_STACK], via_diameter: .3, via_hole_diameter: .15 },
    { route_type: "wire", x: 6, y: .4, layer: "top", width: .1 },
    { route_type: "wire", x: 6, y: 0, layer: "top", width: .1 },
  ] }, { type: "pcb_trace", pcb_trace_id: "native-connector-path", connection_name: input.connections[3]!.name, route: [
    { route_type: "wire", x: -6, y: 5, layer: "top", width: .1 },
    { route_type: "wire", x: -6, y: 7, layer: "top", width: .1 },
  ] });
  input.obstacles.push(...[.4, 6].map((x, index) => ({ type: "rect" as const, shape: "circle" as const,
    center: { x, y: .4 }, width: .3, height: .3, layers: [...PHYSICAL_STACK], connectedTo: [input.connections[2]!.name],
    circuitJsonMetadata: { pcb_via_id: `actual-native-center-via-${index}` }, holeDiameter: .15 })));
  return input;
}

test("control preparation reuses actual display copper while preserving unresolved boot and connector terminals", () => {
  const input = nativeControlInput(), original = JSON.stringify(input);
  const prepared = prepareControlSourceRouting(input);
  expect(prepared.sourceComponentId).toBe("actual-processor");
  expect(prepared.sourceComponentPadCount).toBe(9);
  expect(prepared.reused).toEqual([{ globalConnectionIndex: 0, sourcePointIndex: 0 }, { globalConnectionIndex: 1, sourcePointIndex: 1 }]);
  expect(prepared.pending).toEqual([{ globalConnectionIndex: 2, sourcePointIndex: 0 }]);
  expect(prepared.prepared.connections).toHaveLength(4);
  expect(prepared.sourceInput.connections).toHaveLength(1);
  expect(prepared.prepared.connections[1]!.pointsToConnect).toEqual(input.connections[1]!.pointsToConnect);
  expect(prepared.prepared.connections[3]!.pointsToConnect).toEqual(input.connections[3]!.pointsToConnect);
  expect(JSON.stringify(prepared.sourceInput.traces)).toBe(JSON.stringify(input.traces));
  expect(prepared.prepared.obstacles).toHaveLength(input.obstacles.length);
  expect(prepared.prepared.obstacles.filter(obstacle => obstacle.isCopperPour).map(obstacle => obstacle.layers)).toEqual([["inner1"], ["inner2"]]);
  expect(prepared.prepared.obstacles.filter(obstacle => (obstacle as { isNonPlatedHole?: boolean }).isNonPlatedHole)).toHaveLength(4);
  expect(prepared.rules).toEqual({ traceWidth: .1, clearance: .1, viaDiameter: .3, viaHoleDiameter: .15, gridStep: .1 });
  expect(prepared.sourceInput.connections[0]!.pointsToConnect[0]).not.toBe(input.connections[2]!.pointsToConnect[0]);
  prepared.sourceInput.connections[0]!.pointsToConnect[0]!.x += 3;
  prepared.sourceInput.obstacles[0]!.center.y += 2;
  expect(JSON.stringify(input)).toBe(original);
});

test("electrical aliases without physical contact do not suppress a control source escape", () => {
  const input = nativeControlInput();
  input.traces![0]!.route[0] = { route_type: "wire", x: -1.5, y: -.8, layer: "top", width: .1 };
  const prepared = prepareControlSourceRouting(input);
  expect(prepared.reused).toEqual([{ globalConnectionIndex: 1, sourcePointIndex: 1 }]);
  expect(prepared.pending.map(member => member.globalConnectionIndex)).toEqual([0, 2]);
  expect(() => validateOuterRoutes(input, [])).toThrow("only partially routed");
});

test("authentic fixed source copper crossing the footprint boundary is reused before its remote terminal is joined", () => {
  const input = nativeControlInput();
  input.traces![0]!.route[1] = { route_type: "wire", x: -5, y: -.8, layer: "top", width: .1 };
  const prepared = prepareControlSourceRouting(input);
  expect(prepared.components[0]!.groups).toEqual([[0], [1]]);
  expect(prepared.reused.some(member => member.globalConnectionIndex === 0)).toBe(true);
  expect(prepared.prepared.connections[0]!.pointsToConnect).toEqual(input.connections[0]!.pointsToConnect);
  expect(prepared.prepared.traces).toEqual(input.traces);
  expect(() => validateOuterRoutes(input, [])).toThrow("only partially routed");
});

test("control source prefixes retain every downstream multipoint terminal and immutable earlier phase before a bounded carrier failure", async () => {
  const input = nativeControlInput(), original = JSON.stringify(input);
  const router = await controlAutorouter(input, { maxIterations: 0, maxSourceMilliseconds: 10000, timeSliceMilliseconds: 1 });
  let complete = false;
  router.on("complete", () => { complete = true; });
  const failure = new Promise<Error>(resolve => router.on("error", event => resolve(event.error)));
  void router.start();
  expect((await failure).message).toContain("exceeded 0 iterations");
  expect(complete).toBe(false);
  expect(router.getOutputSimpleRouteJson()).toBeUndefined();
  expect(() => router.getOutputSimplifiedPcbTraces()).toThrow("did not complete");
  const carrier = router.solver!.originalSrj;
  expect(carrier.layerCount).toBe(4);
  expect(carrier.connections).toHaveLength(3);
  expect(carrier.traces).toHaveLength(3);
  expect(JSON.stringify(carrier.traces!.slice(0, 2))).toBe(JSON.stringify(input.traces));
  expect((router.solver!.opts as { immutablePreloadedTraceIds: string[] }).immutablePreloadedTraceIds).toEqual(carrier.traces!.map(trace => trace.pcb_trace_id));
  const byName = new Map(carrier.connections.map(connection => [connection.name, connection]));
  expect(byName.has(input.connections[0]!.name)).toBe(false);
  expect(byName.get(input.connections[1]!.name)!.pointsToConnect).toEqual([input.connections[1]!.pointsToConnect[0]!, input.connections[1]!.pointsToConnect[2]!]);
  expect(byName.get(input.connections[3]!.name)!.pointsToConnect).toEqual(input.connections[3]!.pointsToConnect);
  const local = { ...input, connections: [2].map(index => {
    const sourceIndex = index % 2;
    const carried = byName.get(input.connections[index]!.name)!;
    expect(carried.pointsToConnect[1 - sourceIndex]).toEqual(input.connections[index]!.pointsToConnect[1 - sourceIndex]);
    const handoff = carried.pointsToConnect[sourceIndex]!;
    if (typeof handoff.layer !== "string") throw new Error("The native source handoff must retain an actual surface layer");
    return { ...input.connections[index]!, pointsToConnect: [input.connections[index]!.pointsToConnect[sourceIndex]!, { ...handoff, layer: handoff.layer }] };
  }) };
  expect(validateOuterRoutes(local, carrier.traces!)).toHaveLength(1);
  expect(JSON.stringify(input)).toBe(original);
});

test("complete immutable control copper emits an empty phase only after every original multipoint terminal is physically joined", async () => {
  const input = fullyWiredNativeControlInput(), original = JSON.stringify(input);
  const synchronous = createControlAutorouter(input, { maxIterations: 0, maxSourceMilliseconds: 0 });
  expect(synchronous.solveSync()).toEqual([]);
  expect(synchronous.solver).toBeUndefined();
  expect(synchronous.getOutputSimpleRouteJson()!.traces).toEqual(input.traces);
  expect(validateOuterRoutes(input, synchronous.getOutputSimplifiedPcbTraces())).toEqual([]);
  const asynchronous = await controlAutorouter(input, { maxIterations: 0, maxSourceMilliseconds: 0 });
  let completed: SimplifiedPcbTrace[] | undefined;
  asynchronous.on("complete", event => { completed = event.traces; });
  await asynchronous.start();
  expect(completed).toEqual([]);
  expect(asynchronous.getOutputSimpleRouteJson()!.connections).toEqual(input.connections);
  expect(JSON.stringify(input)).toBe(original);
});

test("a remaining boot branch uses actual display and boot terminals while retaining the complete native phase gate", () => {
  const input = fullyWiredNativeControlInput();
  input.traces = input.traces!.filter(trace => trace.pcb_trace_id !== "native-boot-branch");
  const original = JSON.stringify(input);
  const router = createControlAutorouter(input, { maxIterations: 0, maxSourceMilliseconds: 0 });
  expect(() => router.solveSync()).toThrow("exceeded 0 iterations");
  expect(router.solver!.originalSrj.connections).toHaveLength(1);
  expect(router.solver!.originalSrj.connections[0]!.pointsToConnect).toEqual([input.connections[1]!.pointsToConnect[0]!, input.connections[1]!.pointsToConnect[2]!]);
  expect(JSON.stringify(router.solver!.originalSrj.traces)).toBe(JSON.stringify(input.traces));
  expect(router.getOutputSimpleRouteJson()).toBeUndefined();
  expect(() => validateOuterRoutes(input, [])).toThrow("only partially routed");
  expect(JSON.stringify(input)).toBe(original);
});

test("control routing rejects ambiguous source membership, invalid physical stack and invalid source budgets", async () => {
  const ambiguous = nativeControlInput();
  ambiguous.obstacles.push(...ambiguous.obstacles.filter(obstacle => obstacle.componentId === "actual-processor")
    .map(obstacle => ({ ...obstacle, componentId: "identical-footprint" })));
  expect(() => createControlAutorouter(ambiguous)).toThrow("unambiguous dominant native source footprint");
  const multiple = nativeControlInput();
  multiple.connections[2]!.pointsToConnect.push({ ...multiple.connections[1]!.pointsToConnect[1]! });
  expect(() => createControlAutorouter(multiple)).toThrow("at most one native source terminal");
  const wrongStack = nativeControlInput(); wrongStack.layerCount = 2;
  await expect(controlAutorouter(wrongStack)).rejects.toThrow("four physical layers");
  const blind = nativeControlInput(); blind.allowBlindAndBuriedVias = true;
  expect(() => createControlAutorouter(blind)).toThrow("through vias");
  expect(() => createControlAutorouter(nativeControlInput(), { maxSourceMilliseconds: -1 })).toThrow("non-negative finite number");
});

test("cancelled and synchronous bounded control routes never expose a partial phase", async () => {
  const cancelled = createControlAutorouter(nativeControlInput(), { timeSliceMilliseconds: 1 });
  let complete = false, failed = false;
  cancelled.on("progress", () => cancelled.stop());
  cancelled.on("complete", () => { complete = true; });
  cancelled.on("error", () => { failed = true; });
  await cancelled.start();
  expect(cancelled.solver).toBeUndefined();
  expect(cancelled.getOutputSimpleRouteJson()).toBeUndefined();
  expect(cancelled.isRouting).toBe(false);
  expect(complete).toBe(false); expect(failed).toBe(false);
  const synchronous = createControlAutorouter(nativeControlInput(), { maxIterations: 0, maxSourceMilliseconds: 10000 });
  expect(() => synchronous.solveSync()).toThrow("exceeded 0 iterations");
  expect(synchronous.solver!.originalSrj.traces).toHaveLength(3);
  expect(synchronous.getOutputSimpleRouteJson()).toBeUndefined();
  expect(() => synchronous.solveSync()).toThrow("may only be started once");
});
