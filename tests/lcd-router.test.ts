import { expect, test } from "bun:test";
import type { SimpleRouteJson } from "@tscircuit/core";
import { lcdAutorouter } from "../design/lcd-router";
import { PHYSICAL_STACK, validateOuterRoutes } from "../design/outer-route-validation";

function nativeInput(offset = { x: 1.25, y: -0.75 }): SimpleRouteJson {
  const source = (column: number, row: number) => ({ x: offset.x + column - 1.5, y: offset.y + row - 2 });
  const connections = Array.from({ length: 20 }, (_, index) => {
    const point = source(index % 4, Math.floor(index / 4));
    const sourcePoint = { ...point, layer: "top", pcb_port_id: `source_${index}` };
    const destination = { x: 8, y: -8 + index * .8, layer: "top", pcb_port_id: `destination_${index}` };
    return { name: `LCD_${index}`, source_trace_id: `signal_${index}`,
      pointsToConnect: index % 2 ? [destination, sourcePoint] : [sourcePoint, destination] };
  });
  return { layerCount: 4, minTraceWidth: .1, minViaPadDiameter: .3, minViaHoleDiameter: .15,
    defaultObstacleMargin: .1, allowBlindAndBuriedVias: false,
    bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 }, connections,
    traces: [{ type: "pcb_trace", pcb_trace_id: "native-supply", connection_name: "SUPPLY", route: [
      { route_type: "wire", x: -4, y: 7.5, layer: "top", width: .1 },
      { route_type: "wire", x: 4, y: 7.5, layer: "top", width: .1 },
    ] }],
    obstacles: [
      ...connections.map((connection, index) => ({ type: "rect" as const, shape: "circle" as const,
        componentId: "arbitrary-source", center: connection.pointsToConnect[index % 2]!, width: .3, height: .3, layers: ["top"],
        connectedTo: [connection.name, `source_${index}`], circuitJsonMetadata: { pcb_port_id: `source_${index}` } })),
      ...["inner1", "inner2"].map(layer => ({ type: "rect" as const, center: { x: 0, y: 0 }, width: 20, height: 20,
        layers: [layer], isCopperPour: true, connectedTo: ["GROUND"] })),
      ...[-9, 9].flatMap(y => [-9, -3, 3, 9].map(x => ({ type: "rect" as const, shape: "circle" as const,
        center: { x, y }, width: .6, height: .6, layers: [...PHYSICAL_STACK], isNonPlatedHole: true, connectedTo: [] }))),
    ] };
}

test("LCD source escape preserves all native endpoints, planes and eight drills before bounded carrier routing", async () => {
  const input = nativeInput(), original = JSON.stringify(input);
  const router = await lcdAutorouter(input, { maxIterations: 0, maxSourceMilliseconds: 10000, timeSliceMilliseconds: 1 });
  let complete = false;
  router.on("complete", () => { complete = true; });
  const failure = new Promise<Error>(resolve => router.on("error", event => resolve(event.error)));
  void router.start();
  expect((await failure).message).toContain("exceeded 0 iterations");
  expect(complete).toBe(false);
  expect(router.getOutputSimpleRouteJson()).toBeUndefined();
  const prepared = router.solver!.originalSrj;
  expect(prepared.layerCount).toBe(4);
  expect(prepared.traces).toHaveLength(21);
  expect(prepared.traces![0]).toEqual(input.traces![0]);
  expect((router.solver!.opts as { immutablePreloadedTraceIds: string[] }).immutablePreloadedTraceIds).toEqual(prepared.traces!.map(trace => trace.pcb_trace_id));
  expect(prepared.obstacles.filter(obstacle => (obstacle as { isNonPlatedHole?: boolean }).isNonPlatedHole)).toHaveLength(8);
  expect(prepared.obstacles.filter(obstacle => obstacle.isCopperPour).map(obstacle => obstacle.layers)).toEqual([["inner1"], ["inner2"]]);
  const sourceOnly = { ...input, connections: input.connections.map((connection, index) => ({ ...connection, pointsToConnect: [
    connection.pointsToConnect[index % 2]!, prepared.connections[index]!.pointsToConnect[index % 2]!,
  ] })) };
  expect(validateOuterRoutes(sourceOnly, prepared.traces!)).toHaveLength(20);
  for (const [index, connection] of prepared.connections.entries()) {
    expect(connection.pointsToConnect[1 - index % 2]).toEqual(input.connections[index]!.pointsToConnect[1 - index % 2]);
    const prefix = prepared.traces!.find(trace => trace.connection_name === connection.name)!;
    const source = input.connections[index]!.pointsToConnect[index % 2]!;
    expect(prefix.route[0]).toMatchObject({ x: source.x, y: source.y, layer: source.layer, start_pcb_port_id: source.pcb_port_id });
    expect(prefix.route.filter(point => point.route_type === "wire").every(point => ["top", "bottom"].includes(point.layer))).toBe(true);
  }
  expect(JSON.stringify(input)).toBe(original);
});

test("LCD source selection fails closed on ambiguity, incomplete membership and cancellation", async () => {
  const ambiguous = nativeInput();
  const clone = ambiguous.obstacles.filter(obstacle => obstacle.componentId).map(obstacle => ({ ...obstacle, componentId: "indistinguishable-source" }));
  ambiguous.obstacles.push(...clone);
  await expect(lcdAutorouter(ambiguous)).rejects.toThrow("unambiguous native source footprint");
  const missing = nativeInput();
  missing.obstacles = missing.obstacles.filter(obstacle => obstacle.circuitJsonMetadata?.pcb_port_id !== "source_19");
  await expect(lcdAutorouter(missing)).rejects.toThrow("unambiguous native source footprint");
  const partial = nativeInput(); partial.connections.pop();
  await expect(lcdAutorouter(partial)).rejects.toThrow("all 20 native");
  const cancelled = await lcdAutorouter(nativeInput(), { timeSliceMilliseconds: 1 });
  let complete = false, error = false;
  cancelled.on("progress", () => cancelled.stop());
  cancelled.on("complete", () => { complete = true; });
  cancelled.on("error", () => { error = true; });
  await cancelled.start();
  expect(cancelled.isRouting).toBe(false);
  expect(cancelled.solver).toBeUndefined();
  expect(cancelled.getOutputSimpleRouteJson()).toBeUndefined();
  expect(complete).toBe(false); expect(error).toBe(false);
  const synchronous = await lcdAutorouter(nativeInput(), { maxIterations: 0 });
  expect(() => synchronous.solveSync()).toThrow("exceeded 0 iterations");
  expect(synchronous.solver!.originalSrj.traces).toHaveLength(21);
  expect(synchronous.getOutputSimpleRouteJson()).toBeUndefined();
});
